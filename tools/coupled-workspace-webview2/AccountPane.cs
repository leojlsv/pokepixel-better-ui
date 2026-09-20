using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PokePixel.CoupledWorkspace
{
    internal enum PaneHealthState
    {
        Idle,
        Initializing,
        Loading,
        Ready,
        UiReady,
        Error,
        ProcessFailed,
        Blocked
    }

    internal sealed class AccountPane : IDisposable
    {
        private Task _initializationTask;
        private bool _disposed;

        public AccountPane(ProfileDefinition profile)
        {
            if (profile == null) throw new ArgumentNullException("profile");
            Profile = profile;
            View = new WebView2();
            HealthState = PaneHealthState.Idle;
            HealthText = "Idle";
        }

        public ProfileDefinition Profile { get; private set; }
        public WebView2 View { get; private set; }
        public CoreWebView2Environment Environment { get; private set; }
        public bool IsInitialized { get { return View != null && View.CoreWebView2 != null; } }
        public PaneHealthState HealthState { get; set; }
        public string HealthText { get; set; }
        public string CurrentUrl { get; set; }
        public string LastErrorText { get; set; }
        public ulong ActiveNavigationId { get; set; }

        public Task InitializeAsync(string dataRoot)
        {
            if (string.IsNullOrWhiteSpace(dataRoot))
                throw new ArgumentException("Pane data root is required.", "dataRoot");
            if (_disposed) throw new ObjectDisposedException("AccountPane");

            if (IsInitialized) return Task.FromResult(0);
            if (_initializationTask != null) return _initializationTask;

            _initializationTask = InitializeCoreAsync(dataRoot);
            return _initializationTask;
        }

        private async Task InitializeCoreAsync(string dataRoot)
        {
            var userDataFolder = Path.Combine(dataRoot, Profile.UserDataFolderName);
            Directory.CreateDirectory(userDataFolder);

            try
            {
                var environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                if (_disposed || View == null)
                    throw new ObjectDisposedException("AccountPane");

                Environment = environment;
                await View.EnsureCoreWebView2Async(Environment);
            }
            catch
            {
                _initializationTask = null;
                throw;
            }
        }

        public void Dispose()
        {
            _disposed = true;
            if (View != null)
            {
                View.Dispose();
                View = null;
            }

            Environment = null;
        }
    }
}
