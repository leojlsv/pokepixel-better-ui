using System;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PokePixel.CoupledWorkspace
{
    // Public PPTools website only. This diagnostic never opens or inspects the game.
    internal static class PptoolsHiddenSmoke
    {
        private sealed class HiddenForm : Form
        {
            protected override bool ShowWithoutActivation { get { return true; } }
        }

        public static void Run()
        {
            using (var form = new HiddenForm
            {
                Text = "PPTools background validation",
                ShowInTaskbar = false,
                Opacity = 0,
                FormBorderStyle = FormBorderStyle.None,
                Width = 1280,
                Height = 800,
                StartPosition = FormStartPosition.Manual,
                Left = -32000,
                Top = -32000
            })
            using (var view = new WebView2 { Dock = DockStyle.Fill, TabStop = false })
            using (var timeout = new System.Windows.Forms.Timer { Interval = 180000 })
            {
                form.Controls.Add(view);
                timeout.Tick += delegate
                {
                    timeout.Stop();
                    Console.Error.WriteLine("PPTools hidden WebView2 smoke: TIMEOUT");
                    Environment.ExitCode = 1;
                    form.Close();
                };

                form.Shown += async delegate
                {
                    timeout.Start();
                    try
                    {
                        var dataRoot = Path.Combine(
                            Path.GetTempPath(), "ppbui-pptools-headless-smoke-" + System.Diagnostics.Process.GetCurrentProcess().Id
                        );
                        var environment = await CoreWebView2Environment.CreateAsync(null, dataRoot);
                        await view.EnsureCoreWebView2Async(environment);
                        if (form.IsDisposed) return;
                        view.CoreWebView2.Settings.IsWebMessageEnabled = false;
                        view.CoreWebView2.Settings.AreDevToolsEnabled = false;
                        view.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                        view.CoreWebView2.Navigate("https://www.pptools.com.br/hunt-analyzer");
                        var loaded = await AwaitConditionAsync(view,
                            "!![...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Preencher com JSON')",
                            20000);
                        if (!loaded) throw new InvalidOperationException("PPTools JSON import action did not render.");
                        var modal = false;
                        for (var attempt = 0; attempt < 4 && !modal; attempt++)
                        {
                            await Task.Delay(1250);
                            await view.CoreWebView2.ExecuteScriptAsync(
                                "[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Preencher com JSON').click()"
                            );
                            modal = await AwaitConditionAsync(view,
                                "!!document.querySelector('[role=dialog] textarea')", 3500);
                        }
                        if (!modal) throw new InvalidOperationException("PPTools JSON modal did not render. "
                            + await GetDiagnosticsAsync(view));
                        var input = await view.CoreWebView2.ExecuteScriptAsync(@"(()=>{
                            const area=document.querySelector('[role=dialog] textarea');
                            const data={pokemon:'charmander',level:10,trainerLevel:1,quality:'common',
                              ivs:{hp:20,atk:20,def:20,spAtk:20,spDef:20,speed:20},
                              nature:'adamant',gender:'male',isShiny:false,isStarter:true};
                            const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
                            setter.call(area,JSON.stringify(data));
                            area.dispatchEvent(new Event('input',{bubbles:true}));
                            return area.value.length;
                        })()");
                        Console.WriteLine("PPTools hidden WebView2: JSON textarea length=" + input);
                        var fillEnabled = await AwaitConditionAsync(view,
                            "!![...document.querySelectorAll('[role=dialog] button')].find(x=>x.textContent.trim()==='Preencher campos'&&!x.disabled)", 5000);
                        if (!fillEnabled) throw new InvalidOperationException("PPTools import button did not enable.");
                        await view.CoreWebView2.ExecuteScriptAsync(
                            "[...document.querySelectorAll('[role=dialog] button')].find(x=>x.textContent.trim()==='Preencher campos').click()"
                        );
                        var simulation = await AwaitConditionAsync(view,
                            "!![...document.querySelectorAll('button')].find(x=>x.textContent.includes('Simular 1.000 abates por hunt')&&!x.disabled)",
                            12000);
                        if (!simulation) throw new InvalidOperationException("PPTools simulator was not enabled for JSON input. "
                            + await GetDiagnosticsAsync(view));
                        await view.CoreWebView2.ExecuteScriptAsync(
                            "[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Simular 1.000 abates por hunt')).click()"
                        );
                        var complete = await AwaitConditionAsync(view,
                            "document.querySelectorAll('section[aria-labelledby=\"hunt-results-title\"] tbody tr').length>0",
                            90000);
                        if (!complete) throw new InvalidOperationException("The real PPTools simulator did not produce result rows. "
                            + await GetDiagnosticsAsync(view));
                        var rows = await view.CoreWebView2.ExecuteScriptAsync(
                            "document.querySelectorAll('section[aria-labelledby=\"hunt-results-title\"] tbody tr').length"
                        );
                        Console.WriteLine("PPTools hidden WebView2 smoke: PASS; rows=" + rows);
                    }
                    catch (Exception error)
                    {
                        Console.Error.WriteLine("PPTools hidden WebView2 smoke: FAIL " + error.Message);
                        Environment.ExitCode = 1;
                    }
                    finally
                    {
                        timeout.Stop();
                        if (!form.IsDisposed) form.Close();
                    }
                };
                Application.Run(form);
            }
        }

        private static async Task<bool> AwaitConditionAsync(WebView2 view, string condition, int deadlineMs)
        {
            var started = DateTime.UtcNow;
            while ((DateTime.UtcNow - started).TotalMilliseconds < deadlineMs)
            {
                var core = view.CoreWebView2;
                if (core == null) return false;
                try
                {
                    var status = await core.ExecuteScriptAsync("Boolean(" + condition + ")");
                    if (string.Equals(status, "true", StringComparison.Ordinal)) return true;
                }
                catch (InvalidOperationException) { }
                await Task.Delay(200);
            }
            return false;
        }

        private static async Task<string> GetDiagnosticsAsync(WebView2 view)
        {
            try
            {
                return await view.CoreWebView2.ExecuteScriptAsync(
                    "JSON.stringify({title:document.title,ready:document.readyState,hasNext:Boolean(window.next),scripts:document.scripts.length," +
                    "dialogs:document.querySelectorAll('[role=dialog]').length,alerts:[...document.querySelectorAll('[role=alert],[role=status]')].map(x=>x.textContent.trim()).slice(-4)," +
                    "buttons:[...document.querySelectorAll('button')].map(x=>({text:x.textContent.trim().slice(0,45),disabled:x.disabled})).slice(-8)," +
                    "results:document.querySelectorAll('section[aria-labelledby=\\\"hunt-results-title\\\"] tbody tr').length})"
                );
            }
            catch (Exception error) { return error.Message; }
        }
    }
}
