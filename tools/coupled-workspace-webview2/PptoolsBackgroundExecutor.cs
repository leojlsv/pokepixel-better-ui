using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PokePixel.CoupledWorkspace
{
    // Runs the public PPTools UI in a separate, unexposed WebView2. No game
    // session, credentials or shared game profile is ever loaded in this view.
    internal sealed class PptoolsBackgroundExecutor
    {
        public const string Url = "https://www.pptools.com.br/hunt-analyzer";
        public const int MaxResultBytes = 16000;
        public const int MaxInputBytes = 16000;
        private const int LoadTimeoutMs = 30000;
        private const int SimulationTimeoutMs = 120000;
        private const int ScriptTimeoutMs = 10000;
        private const int StartupQueueTimeoutMs = 5000;

        // Keep native WebView2 bootstrap work bounded even when a native async
        // initialization outlives its caller-visible deadline.
        private static readonly SemaphoreSlim StartupSlots = new SemaphoreSlim(2, 2);

        private readonly string _script;
        private readonly string _storageRoot;

        public PptoolsBackgroundExecutor(string binaryDirectory, string storageRoot, bool enabled = false)
        {
            var scriptPath = enabled ? Path.Combine(binaryDirectory, "pptools-runner.js") : null;
            _script = scriptPath != null && File.Exists(scriptPath) ? File.ReadAllText(scriptPath, Encoding.UTF8) : null;
            _storageRoot = Path.Combine(storageRoot, "pptools-ephemeral");
            if (Available) Task.Run(() => CleanupExpiredProfiles());
        }

        private void CleanupExpiredProfiles()
        {
            if (!Directory.Exists(_storageRoot)) return;
            try
            {
                foreach (var candidate in Directory.GetDirectories(_storageRoot, "job-*", SearchOption.TopDirectoryOnly))
                {
                    try
                    {
                        if (DateTime.UtcNow - Directory.GetCreationTimeUtc(candidate) <= TimeSpan.FromHours(2)) continue;
                        Directory.Delete(candidate, true);
                    }
                    catch (IOException) { }
                    catch (UnauthorizedAccessException) { }
                }
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }

        public bool Available { get { return !string.IsNullOrWhiteSpace(_script); } }

        private sealed class InvisibleForm : Form
        {
            protected override bool ShowWithoutActivation { get { return true; } }
        }

        [DataContract]
        private sealed class PublicResult
        {
            [DataMember(Name = "type")] public string Type { get; set; }
            [DataMember(Name = "requestId")] public string RequestId { get; set; }
            [DataMember(Name = "ok")] public bool Ok { get; set; }
            [DataMember(Name = "error", EmitDefaultValue = false)] public string Error { get; set; }
            [DataMember(Name = "resultJson", EmitDefaultValue = false)] public string ResultJson { get; set; }
        }

        [DataContract]
        private sealed class StartAcknowledgement
        {
            [DataMember(Name = "accepted")] public bool? Accepted { get; set; }
            [DataMember(Name = "requestId", EmitDefaultValue = false)] public string RequestId { get; set; }
        }

        private static bool IsSuccessfulStartAcknowledgement(string json, string expectedRequestId)
        {
            if (string.IsNullOrWhiteSpace(json) || json.Length > 1024) return false;
            try
            {
                var serializer = new DataContractJsonSerializer(typeof(StartAcknowledgement));
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                {
                    var reply = serializer.ReadObject(stream) as StartAcknowledgement;
                    return reply != null && reply.Accepted == true &&
                        string.Equals(reply.RequestId, expectedRequestId, StringComparison.Ordinal);
                }
            }
            catch (SerializationException) { return false; }
        }

        [DataContract]
        private sealed class PptoolsPayload
        {
            [DataMember(Name = "schema")] public string Schema { get; set; }
            [DataMember(Name = "version")] public int Version { get; set; }
            [DataMember(Name = "source")] public PptoolsSource Source { get; set; }
            [DataMember(Name = "recommendations")] public List<PptoolsRow> Recommendations { get; set; }
        }

        [DataContract]
        private sealed class PptoolsSource
        {
            [DataMember(Name = "url")] public string Url { get; set; }
            [DataMember(Name = "capturedAt")] public string CapturedAt { get; set; }
            [DataMember(Name = "sort")] public PptoolsSort Sort { get; set; }
            [DataMember(Name = "filter")] public string Filter { get; set; }
            [DataMember(Name = "scope")] public PptoolsScope Scope { get; set; }
        }

        [DataContract]
        private sealed class PptoolsSort
        {
            [DataMember(Name = "key")] public string Key { get; set; }
            [DataMember(Name = "direction")] public string Direction { get; set; }
        }

        [DataContract]
        private sealed class PptoolsScope
        {
            [DataMember(Name = "kind")] public string Kind { get; set; }
            [DataMember(Name = "page")] public int? Page { get; set; }
        }

        [DataContract]
        private sealed class PptoolsRow
        {
            [DataMember(Name = "rank")] public int Rank { get; set; }
            [DataMember(Name = "wildSpeciesName")] public string WildSpeciesName { get; set; }
            [DataMember(Name = "huntName")] public string HuntName { get; set; }
            [DataMember(Name = "wildLevelText")] public string WildLevelText { get; set; }
            [DataMember(Name = "xpPerHourText")] public string XpPerHourText { get; set; }
            [DataMember(Name = "goldPerHourText")] public string GoldPerHourText { get; set; }
        }

        private static bool Bounded(string value, int max)
        {
            return !string.IsNullOrWhiteSpace(value) && value.Length <= max;
        }

        private static bool IsValidResultJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json) || Encoding.UTF8.GetByteCount(json) > MaxResultBytes) return false;
            try
            {
                var serializer = new DataContractJsonSerializer(typeof(PptoolsPayload));
                PptoolsPayload value;
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                    value = serializer.ReadObject(stream) as PptoolsPayload;
                if (value == null || value.Schema != "ppbui.pptools.hunt-recommendations" ||
                    value.Version != 1 || value.Source == null || value.Source.Url != Url ||
                    value.Source.Sort == null || value.Source.Sort.Key != "xp" ||
                    value.Source.Sort.Direction != "desc" || value.Source.Scope == null ||
                    value.Source.Scope.Kind != "all-results" || value.Source.Scope.Page != null ||
                    value.Source.Filter != "" || value.Recommendations == null ||
                    value.Recommendations.Count < 1 || value.Recommendations.Count > 3) return false;

                DateTime timestamp;
                if (!DateTime.TryParseExact(value.Source.CapturedAt, "yyyy-MM-dd'T'HH:mm:ss.fff'Z'",
                    CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                    out timestamp) || Math.Abs((DateTime.UtcNow - timestamp).TotalMinutes) > 5) return false;
                for (var index = 0; index < value.Recommendations.Count; index++)
                {
                    var row = value.Recommendations[index];
                    if (row == null || row.Rank != index + 1 ||
                        !Bounded(row.WildSpeciesName, 100) || !Bounded(row.HuntName, 140) ||
                        !Bounded(row.WildLevelText, 48) || !Bounded(row.XpPerHourText, 100) ||
                        !Bounded(row.GoldPerHourText, 100)) return false;
                }
                return true;
            }
            catch (SerializationException) { return false; }
        }

        private static string JsonString(string value)
        {
            var serializer = new DataContractJsonSerializer(typeof(string));
            using (var stream = new MemoryStream())
            {
                serializer.WriteObject(stream, value);
                return Encoding.UTF8.GetString(stream.ToArray());
            }
        }

        private static bool IsPptoolsDocument(string raw)
        {
            Uri uri;
            if (!Uri.TryCreate(raw, UriKind.Absolute, out uri)) return false;
            return string.Equals(uri.Scheme, "https", StringComparison.OrdinalIgnoreCase)
                && string.Equals(uri.Host, "www.pptools.com.br", StringComparison.OrdinalIgnoreCase)
                && uri.IsDefaultPort && string.Equals(uri.AbsolutePath, "/hunt-analyzer", StringComparison.Ordinal)
                && string.IsNullOrEmpty(uri.Query) && string.IsNullOrEmpty(uri.Fragment)
                && string.IsNullOrEmpty(uri.UserInfo);
        }

        private static PublicResult ReadResult(string json)
        {
            if (string.IsNullOrEmpty(json) || Encoding.UTF8.GetByteCount(json) > 22000) return null;
            try
            {
                var serializer = new DataContractJsonSerializer(typeof(PublicResult));
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                    return serializer.ReadObject(stream) as PublicResult;
            }
            catch (SerializationException) { return null; }
        }

        public async Task<string> RunAsync(Form owner, string requestId, string attackerJson, CancellationToken cancellation)
        {
            if (!Available) throw new InvalidOperationException("Runner público do PPTools não instalado no host.");
            if (owner == null || owner.IsDisposed) throw new ObjectDisposedException("Coupled Workspace");
            if (string.IsNullOrWhiteSpace(requestId) || requestId.Length > 100 ||
                string.IsNullOrWhiteSpace(attackerJson) || Encoding.UTF8.GetByteCount(attackerJson) > MaxInputBytes)
                throw new InvalidOperationException("Parâmetros da simulação inválidos.");

            var path = Path.Combine(_storageRoot, "job-" + Guid.NewGuid().ToString("N"));
            try
            {
            using (var window = new InvisibleForm
            {
                Opacity = 0,
                ShowInTaskbar = false,
                FormBorderStyle = FormBorderStyle.None,
                StartPosition = FormStartPosition.Manual,
                Left = -32000,
                Top = -32000,
                Width = 1280,
                Height = 800,
                Text = "PPTools background"
            })
            using (var view = new WebView2 { Dock = DockStyle.Fill, TabStop = false })
            {
                window.Controls.Add(view);
                window.Show(owner);
                try
                {
                    cancellation.ThrowIfCancellationRequested();
                    var environment = await RunStartupBoundedAsync(
                        () => CoreWebView2Environment.CreateAsync(null, path), 25000, cancellation, path);
                    var controllerOptions = environment.CreateCoreWebView2ControllerOptions();
                    controllerOptions.IsInPrivateModeEnabled = true;
                    await RunStartupBoundedAsync(async () =>
                    {
                        await view.EnsureCoreWebView2Async(environment, controllerOptions);
                        return true;
                    }, 25000, cancellation, path);
                    cancellation.ThrowIfCancellationRequested();
                    var core = view.CoreWebView2;
                    core.Settings.AreDefaultContextMenusEnabled = false;
                    core.Settings.AreDevToolsEnabled = false;
                    core.Settings.IsStatusBarEnabled = false;

                    var navigation = new TaskCompletionSource<bool>();
                    var completed = new TaskCompletionSource<PublicResult>();
                    core.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs args)
                    {
                        if (!IsPptoolsDocument(args.Uri))
                        {
                            args.Cancel = true;
                            navigation.TrySetException(new InvalidOperationException("Navegação externa do executor bloqueada."));
                            completed.TrySetException(new InvalidOperationException("Navegação externa do executor bloqueada."));
                        }
                    };
                    core.NavigationCompleted += delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
                    {
                        if (args.IsSuccess && IsPptoolsDocument(core.Source)) navigation.TrySetResult(true);
                        else navigation.TrySetException(new InvalidOperationException("Não foi possível abrir o PPTools."));
                    };
                    core.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs args)
                    {
                        args.Handled = true;
                    };
                    core.PermissionRequested += delegate(object sender, CoreWebView2PermissionRequestedEventArgs args)
                    {
                        args.State = CoreWebView2PermissionState.Deny;
                    };
                    core.ProcessFailed += delegate(object sender, CoreWebView2ProcessFailedEventArgs args)
                    {
                        var failure = new InvalidOperationException("O processo de simulação do PPTools foi interrompido.");
                        navigation.TrySetException(failure);
                        completed.TrySetException(failure);
                    };
                    core.WebMessageReceived += delegate(object sender, CoreWebView2WebMessageReceivedEventArgs args)
                    {
                        if (!IsPptoolsDocument(args.Source) || !IsPptoolsDocument(core.Source)) return;
                        var response = ReadResult(args.WebMessageAsJson);
                        if (response == null || response.Type != "ppbui.pptools.complete" ||
                            !string.Equals(response.RequestId, requestId, StringComparison.Ordinal)) return;
                        if (response.Ok && !IsValidResultJson(response.ResultJson))
                            completed.TrySetException(new InvalidOperationException("Resposta pública do PPTools inválida."));
                        else completed.TrySetResult(response);
                    };

                    core.Navigate(Url);
                    await WaitBoundedAsync(navigation.Task, LoadTimeoutMs, cancellation);
                    if (!IsPptoolsDocument(core.Source)) throw new InvalidOperationException("A origem do executor foi alterada.");
                    await WaitBoundedAsync(core.ExecuteScriptAsync(_script), ScriptTimeoutMs, cancellation);
                    cancellation.ThrowIfCancellationRequested();
                    var ack = await WaitBoundedAsync(core.ExecuteScriptAsync(
                        "window.__PPBUI_PPTOOLS_RUNNER__.start("
                        + JsonString(requestId) + "," + JsonString(attackerJson) + ")"),
                        ScriptTimeoutMs, cancellation);
                    if (!IsSuccessfulStartAcknowledgement(ack, requestId))
                        throw new InvalidOperationException("PPTools recusou iniciar a consulta ou o executor não confirmou o início.");
                    var responseValue = await WaitBoundedAsync(completed.Task, SimulationTimeoutMs, cancellation);
                    if (!responseValue.Ok) throw new InvalidOperationException(
                        string.IsNullOrWhiteSpace(responseValue.Error) ? "A simulação do PPTools não produziu resultados." : responseValue.Error);
                    return responseValue.ResultJson;
                }
                finally
                {
                    window.Close();
                }
            }
            }
            finally
            {
                // InPrivate mode does not persist site inputs. Chromium can
                // release files after disposal; clean the unique cache folder
                // off the UI thread without delaying the gameplay surface.
                QueueProfileCleanup(path);
            }
        }

        private static void QueueProfileCleanup(string path)
        {
            var cleanup = Task.Run(() =>
            {
                for (var attempt = 0; attempt < 30; attempt++)
                {
                    try
                    {
                        if (Directory.Exists(path)) Directory.Delete(path, true);
                        return;
                    }
                    catch (IOException) { }
                    catch (UnauthorizedAccessException) { }
                    Thread.Sleep(250);
                }
                Console.Error.WriteLine("[CoupledWorkspace] Temporary PPTools cache cleanup failed.");
            });
        }

        private static void ObserveLateFault(Task work)
        {
            var faultObserver = work.ContinueWith(finished => { var ignored = finished.Exception; },
                CancellationToken.None,
                TaskContinuationOptions.OnlyOnFaulted | TaskContinuationOptions.ExecuteSynchronously,
                TaskScheduler.Default);
        }

        private static async Task<T> WaitBoundedAsync<T>(Task<T> work, int timeoutMs, CancellationToken cancellation)
        {
            ObserveLateFault(work);
            cancellation.ThrowIfCancellationRequested();
            using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation))
            {
                var elapsed = Task.Delay(timeoutMs, timeout.Token);
                if (await Task.WhenAny(work, elapsed) != work)
                {
                    cancellation.ThrowIfCancellationRequested();
                    throw new TimeoutException("A consulta do PPTools excedeu o tempo permitido.");
                }
                timeout.Cancel();
                return await work;
            }
        }

        private static async Task WaitBoundedAsync(Task work, int timeoutMs, CancellationToken cancellation)
        {
            ObserveLateFault(work);
            cancellation.ThrowIfCancellationRequested();
            using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation))
            {
                var elapsed = Task.Delay(timeoutMs, timeout.Token);
                if (await Task.WhenAny(work, elapsed) != work)
                {
                    cancellation.ThrowIfCancellationRequested();
                    throw new TimeoutException("Inicialização do navegador PPTools excedeu o prazo.");
                }
                timeout.Cancel();
                await work;
            }
        }

        // Native bootstrap cannot be canceled by WebView2. The caller receives
        // a bounded timeout, while the permit remains held until native work
        // actually exits; permanently hung boots exhaust a fixed quota instead
        // of spawning an unbounded number of browser processes.
        private static async Task<T> RunStartupBoundedAsync<T>(
            Func<Task<T>> start, int timeoutMs, CancellationToken cancellation, string jobPath)
        {
            using (var queue = CancellationTokenSource.CreateLinkedTokenSource(cancellation))
            {
                queue.CancelAfter(StartupQueueTimeoutMs);
                try { await StartupSlots.WaitAsync(queue.Token); }
                catch (OperationCanceledException)
                {
                    cancellation.ThrowIfCancellationRequested();
                    throw new TimeoutException("Inicialização do PPTools indisponível: limite de navegadores atingido.");
                }
            }

            Task<T> native;
            try
            {
                cancellation.ThrowIfCancellationRequested();
                native = start();
                if (native == null) throw new InvalidOperationException("Inicialização nativa do PPTools ausente.");
            }
            catch
            {
                StartupSlots.Release();
                throw;
            }
            var releaseOnCompletion = native.ContinueWith(finished =>
            {
                var ignored = finished.Exception;
                StartupSlots.Release();
            }, CancellationToken.None, TaskContinuationOptions.ExecuteSynchronously, TaskScheduler.Default);
            try
            {
                return await WaitBoundedAsync(native, timeoutMs, cancellation);
            }
            catch
            {
                // A timed-out native boot may create its cache only after the
                // outer finally has already checked the directory. Retry after
                // the native task actually settles, without touching its view.
                var lateCleanup = native.ContinueWith(finished =>
                {
                    var ignored = finished.Exception;
                    QueueProfileCleanup(jobPath);
                }, CancellationToken.None, TaskContinuationOptions.ExecuteSynchronously, TaskScheduler.Default);
                throw;
            }
        }
    }
}
