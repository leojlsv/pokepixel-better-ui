using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;

namespace PokePixel.CoupledWorkspace
{
    internal sealed class EvidenceDevToolsCapture : IDisposable
    {
        private const int MaxRawEventChars = 256 * 1024;
        private const int MaxBodyBytes = 48 * 1024;
        private const int MaxBodyResultChars = 128 * 1024;

        [DataContract]
        private sealed class DevToolsBodyResult
        {
            [DataMember(Name = "body")]
            public string Body { get; set; }

            [DataMember(Name = "base64Encoded")]
            public bool Base64Encoded { get; set; }
        }

        private sealed class Subscription
        {
            public CoreWebView2DevToolsProtocolEventReceiver Receiver;
            public EventHandler<CoreWebView2DevToolsProtocolEventReceivedEventArgs> Handler;
        }

        private readonly CoreWebView2 _core;
        private readonly List<Subscription> _subscriptions = new List<Subscription>();
        private readonly HashSet<string> _bodyCandidates = new HashSet<string>(StringComparer.Ordinal);
        private readonly EventHandler<CoreWebView2WebMessageReceivedEventArgs> _messageHandler;
        private bool _disposed;
        private bool _recordingHint;

        private EvidenceDevToolsCapture(CoreWebView2 core)
        {
            if (core == null) throw new ArgumentNullException("core");
            _core = core;
            _messageHandler = OnWebMessageReceived;
            _core.WebMessageReceived += _messageHandler;
        }

        public static async Task<EvidenceDevToolsCapture> AttachAsync(CoreWebView2 core)
        {
            var capture = new EvidenceDevToolsCapture(core);
            try
            {
                await core.CallDevToolsProtocolMethodAsync("Network.enable", "{}");

                capture.Subscribe("Network.requestWillBeSent", "browser.http.request", capture.OnRequestWillBeSent);
                capture.Subscribe("Network.requestWillBeSentExtraInfo", "browser.http.request.extra", null);
                capture.Subscribe("Network.responseReceived", "browser.http.response", capture.OnResponseReceived);
                capture.Subscribe("Network.responseReceivedExtraInfo", "browser.http.response.extra", null);
                capture.Subscribe("Network.loadingFailed", "browser.http.error", capture.OnRequestTerminal);
                capture.Subscribe("Network.loadingFinished", "browser.http.finished", capture.OnLoadingFinished);
                capture.Subscribe("Network.requestServedFromCache", "browser.http.cache", null);

                capture.Subscribe("Network.webSocketCreated", "browser.ws.opening", null);
                capture.Subscribe("Network.webSocketWillSendHandshakeRequest", "browser.ws.handshake.out", null);
                capture.Subscribe("Network.webSocketHandshakeResponseReceived", "browser.ws.handshake.in", null);
                capture.Subscribe("Network.webSocketFrameSent", "browser.ws.out", null);
                capture.Subscribe("Network.webSocketFrameReceived", "browser.ws.in", null);
                capture.Subscribe("Network.webSocketFrameError", "browser.ws.error", null);
                capture.Subscribe("Network.webSocketClosed", "browser.ws.close", null);
                capture.Subscribe("Network.eventSourceMessageReceived", "browser.sse.in", null);

                capture.Subscribe("Network.webTransportCreated", "browser.webtransport.opening", null);
                capture.Subscribe("Network.webTransportConnectionEstablished", "browser.webtransport.open", null);
                capture.Subscribe("Network.webTransportClosed", "browser.webtransport.close", null);

                return capture;
            }
            catch
            {
                capture.Dispose();
                throw;
            }
        }

        private void Subscribe(
            string eventName,
            string evidenceKind,
            Action<string> inspect
        )
        {
            CoreWebView2DevToolsProtocolEventReceiver receiver;
            try
            {
                receiver = _core.GetDevToolsProtocolEventReceiver(eventName);
            }
            catch
            {
                return;
            }

            EventHandler<CoreWebView2DevToolsProtocolEventReceivedEventArgs> handler = delegate(
                object sender,
                CoreWebView2DevToolsProtocolEventReceivedEventArgs args
            )
            {
                if (_disposed || !_recordingHint) return;
                var raw = args.ParameterObjectAsJson ?? "{}";
                if (inspect != null)
                {
                    try { inspect(raw); }
                    catch { /* Supplemental capture must not affect navigation. */ }
                }
                EmitRaw(evidenceKind, raw);
            };

            receiver.DevToolsProtocolEventReceived += handler;
            _subscriptions.Add(new Subscription { Receiver = receiver, Handler = handler });
        }

        private void OnRequestWillBeSent(string raw)
        {
            // responseReceived is authoritative for whether a response body is useful.
        }

        private void OnResponseReceived(string raw)
        {
            var requestId = ExtractJsonString(raw, "requestId");
            if (string.IsNullOrEmpty(requestId)) return;
            var resourceType = ExtractJsonString(raw, "type");
            var mimeType = ExtractJsonString(raw, "mimeType");
            if ((string.Equals(resourceType, "XHR", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(resourceType, "Fetch", StringComparison.OrdinalIgnoreCase))
                && IsReadableMime(mimeType))
            {
                _bodyCandidates.Add(requestId);
            }
        }

        private void OnRequestTerminal(string raw)
        {
            var requestId = ExtractJsonString(raw, "requestId");
            if (!string.IsNullOrEmpty(requestId)) _bodyCandidates.Remove(requestId);
        }

        private void OnLoadingFinished(string raw)
        {
            var requestId = ExtractJsonString(raw, "requestId");
            if (string.IsNullOrEmpty(requestId) || !_bodyCandidates.Remove(requestId)) return;
            CaptureBody(requestId);
        }

        private async void CaptureBody(string requestId)
        {
            try
            {
                if (_disposed || !_recordingHint || !await IsRecorderActiveAsync()) return;
                var response = await _core.CallDevToolsProtocolMethodAsync(
                    "Network.getResponseBody",
                    "{\"requestId\":" + QuoteJs(requestId) + "}"
                );
                if (_disposed) return;
                if (string.IsNullOrEmpty(response)) response = "{}";
                if (response.Length > MaxBodyResultChars)
                {
                    EmitObject(
                        "browser.http.body.skipped",
                        "{\"requestId\":" + QuoteJs(requestId)
                            + ",\"reason\":\"cdp_body_exceeds_limit\",\"resultChars\":"
                            + response.Length.ToString(System.Globalization.CultureInfo.InvariantCulture) + "}"
                    );
                    return;
                }
                var decoded = DeserializeBody(response);
                if (decoded == null || decoded.Body == null)
                {
                    EmitObject(
                        "browser.http.body.skipped",
                        "{\"requestId\":" + QuoteJs(requestId)
                            + ",\"reason\":\"cdp_body_parse_failed\"}"
                    );
                    return;
                }
                string text;
                if (decoded.Base64Encoded)
                {
                    byte[] rawBytes;
                    try { rawBytes = Convert.FromBase64String(decoded.Body); }
                    catch
                    {
                        EmitObject(
                            "browser.http.body.skipped",
                            "{\"requestId\":" + QuoteJs(requestId)
                                + ",\"reason\":\"cdp_base64_invalid\"}"
                        );
                        return;
                    }
                    if (rawBytes.Length > MaxBodyBytes)
                    {
                        EmitObject(
                            "browser.http.body.skipped",
                            "{\"requestId\":" + QuoteJs(requestId)
                                + ",\"reason\":\"cdp_body_exceeds_limit\",\"bytes\":"
                                + rawBytes.Length.ToString(System.Globalization.CultureInfo.InvariantCulture) + "}"
                        );
                        return;
                    }
                    text = Encoding.UTF8.GetString(rawBytes);
                }
                else
                {
                    if (Encoding.UTF8.GetByteCount(decoded.Body) > MaxBodyBytes)
                    {
                        EmitObject(
                            "browser.http.body.skipped",
                            "{\"requestId\":" + QuoteJs(requestId)
                                + ",\"reason\":\"cdp_body_exceeds_limit\"}"
                        );
                        return;
                    }
                    text = decoded.Body;
                }
                EmitObject(
                    "browser.http.body",
                    "{\"requestId\":" + QuoteJs(requestId)
                        + ",\"result\":{\"body\":" + QuoteJs(text)
                        + ",\"base64Encoded\":false,\"decodedFromBase64\":"
                        + (decoded.Base64Encoded ? "true" : "false") + "}}"
                );
            }
            catch (Exception ex)
            {
                if (_disposed) return;
                EmitObject(
                    "browser.http.body.skipped",
                    "{\"requestId\":" + QuoteJs(requestId)
                        + ",\"reason\":\"cdp_body_unavailable\",\"error\":"
                        + QuoteJs(ex.GetType().Name) + "}"
                );
            }
        }

        private async Task<bool> IsRecorderActiveAsync()
        {
            try
            {
                var result = await _core.ExecuteScriptAsync(
                    "Boolean(window.__PPBUI_EVIDENCE__&&window.__PPBUI_EVIDENCE__.stats().recording)"
                );
                return string.Equals(result, "true", StringComparison.Ordinal);
            }
            catch
            {
                return false;
            }
        }

        private async void EmitRaw(string kind, string raw)
        {
            if (_disposed || !_recordingHint) return;
            try
            {
                if (raw.Length > MaxRawEventChars)
                {
                    EmitObject(
                        "browser.cdp.skipped",
                        "{\"event\":" + QuoteJs(kind)
                            + ",\"reason\":\"cdp_event_exceeds_limit\",\"chars\":"
                            + raw.Length.ToString(System.Globalization.CultureInfo.InvariantCulture) + "}"
                    );
                    return;
                }
                await _core.ExecuteScriptAsync(BuildIngestScript(kind, raw));
            }
            catch
            {
                // Capture is observational. Never let telemetry failures affect the game host.
            }
        }

        private async void EmitObject(string kind, string objectJson)
        {
            if (_disposed || !_recordingHint) return;
            try { await _core.ExecuteScriptAsync(BuildIngestScript(kind, objectJson)); }
            catch { /* Observational only. */ }
        }

        private static string BuildIngestScript(string kind, string objectJson)
        {
            return "(function(){var p=window.__PPBUI_EVIDENCE__;"
                + "if(!p||typeof p.ingestBrowserEvent!=='function'||!p.stats().recording)return false;"
                + "try{return p.ingestBrowserEvent(" + QuoteJs(kind) + ",JSON.parse("
                + QuoteJs(objectJson) + "));}catch(_){return false;}})()";
        }

        private static DevToolsBodyResult DeserializeBody(string json)
        {
            try
            {
                var serializer = new DataContractJsonSerializer(typeof(DevToolsBodyResult));
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                    return serializer.ReadObject(stream) as DevToolsBodyResult;
            }
            catch
            {
                return null;
            }
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs args)
        {
            if (_disposed || !IsTargetSource(args.Source)) return;
            var json = args.WebMessageAsJson ?? string.Empty;
            if (json.IndexOf("\"ppbui.evidence.recording\"", StringComparison.Ordinal) < 0) return;
            _recordingHint = Regex.IsMatch(
                json,
                "\\\"recording\\\"\\s*:\\s*true",
                RegexOptions.CultureInvariant | RegexOptions.IgnoreCase
            );
        }

        private static bool IsTargetSource(string source)
        {
            Uri uri;
            return Uri.TryCreate(source, UriKind.Absolute, out uri)
                && string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
                && string.Equals(uri.Host, "pokepixel.nietore.com", StringComparison.OrdinalIgnoreCase);
        }

        private static string ExtractJsonString(string raw, string property)
        {
            if (string.IsNullOrEmpty(raw)) return string.Empty;
            var pattern = "\\\"" + Regex.Escape(property) + "\\\"\\s*:\\s*\\\"([^\\\"]*)\\\"";
            var match = Regex.Match(raw, pattern, RegexOptions.CultureInvariant);
            return match.Success ? match.Groups[1].Value : string.Empty;
        }

        private static bool IsReadableMime(string mimeType)
        {
            if (string.IsNullOrEmpty(mimeType)) return false;
            return mimeType.IndexOf("json", StringComparison.OrdinalIgnoreCase) >= 0
                || mimeType.IndexOf("text/", StringComparison.OrdinalIgnoreCase) >= 0
                || mimeType.IndexOf("xml", StringComparison.OrdinalIgnoreCase) >= 0
                || mimeType.IndexOf("graphql", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static string QuoteJs(string value)
        {
            if (value == null) value = string.Empty;
            return "\"" + value
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n")
                .Replace("\u2028", "\\u2028")
                .Replace("\u2029", "\\u2029") + "\"";
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            try { _core.WebMessageReceived -= _messageHandler; }
            catch { /* WebView may already be tearing down. */ }
            foreach (var subscription in _subscriptions)
            {
                try
                {
                    subscription.Receiver.DevToolsProtocolEventReceived -= subscription.Handler;
                }
                catch { /* WebView may already be tearing down. */ }
            }
            _subscriptions.Clear();
            _bodyCandidates.Clear();
        }
    }
}
