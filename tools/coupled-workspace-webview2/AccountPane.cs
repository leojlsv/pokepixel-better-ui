using System;
using System.Collections.Generic;
using System.Diagnostics;
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

    internal sealed class ViewDocumentSessionSnapshot
    {
        public string Url { get; set; }
        public string Epoch { get; set; }
        public string SessionId { get; set; }
        public int MountOrdinal { get; set; }
        public int CapabilitySeq { get; set; }
        public int ViewRevision { get; set; }
    }

    internal sealed class AccountPane : IDisposable
    {
        private Task _initializationTask;
        private bool _disposed;
        private readonly WorkspacePerfMetrics _perfMetrics;
        private readonly HashSet<string> _issuedViewSessions = new HashSet<string>(StringComparer.Ordinal);

        public AccountPane(ProfileDefinition profile, WorkspacePerfMetrics perfMetrics = null)
        {
            if (profile == null) throw new ArgumentNullException("profile");
            _perfMetrics = perfMetrics;
            Profile = profile;
            View = new WebView2();
            HealthState = PaneHealthState.Idle;
            HealthText = "Idle";
            CardsViewActive = true;
            AvailableSurfaces = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            PendingWorkspaceRequests = new Dictionary<string, string>(StringComparer.Ordinal);
            BeginViewDocument();
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
        public ulong PerfNavigationId { get; set; }
        public long PerfNavigationStartedAt { get; set; }
        public bool PerfNavigationUiReadyObserved { get; set; }
        public bool WorkspaceBridgeReady { get; set; }
        public string ViewDocumentEpoch { get; private set; }
        public bool ViewDocumentCommitted { get; private set; }
        public bool StrictViewSession { get; set; }
        public string ViewSessionId { get; set; }
        public int ViewMountOrdinal { get; set; }
        public int ViewCapabilitySeq { get; set; }
        public int ViewRevision { get; set; }
        public bool ViewSendRetryScheduled { get; set; }
        public int ViewSendRetryGeneration { get; set; }
        public bool ViewResyncRetryScheduled { get; set; }
        public int ViewResyncRetryGeneration { get; set; }
        public int ViewResyncRetryCapabilitySeq { get; set; }
        public bool ViewReplacementContentStarted { get; set; }
        public ViewDocumentSessionSnapshot InterruptedViewDocument { get; private set; }
        public bool CardsViewActive { get; set; }
        public HashSet<string> AvailableSurfaces { get; private set; }
        public Dictionary<string, string> PendingWorkspaceRequests { get; private set; }
        public EvidenceDevToolsCapture EvidenceCapture { get; set; }

        public void BeginViewDocument()
        {
            InterruptedViewDocument = ViewDocumentCommitted && StrictViewSession
                && WorkspaceBridgeReady && !string.IsNullOrWhiteSpace(CurrentUrl)
                ? new ViewDocumentSessionSnapshot
                {
                    Url = CurrentUrl,
                    Epoch = ViewDocumentEpoch,
                    SessionId = ViewSessionId,
                    MountOrdinal = ViewMountOrdinal,
                    CapabilitySeq = ViewCapabilitySeq,
                    ViewRevision = ViewRevision
                }
                : null;
            ResetWorkspaceBridge();
            _issuedViewSessions.Clear();
            ViewDocumentEpoch = Guid.NewGuid().ToString("N");
            ViewDocumentCommitted = false;
            StrictViewSession = false;
            ViewSessionId = null;
            ViewMountOrdinal = 0;
            ViewCapabilitySeq = 0;
            ViewSendRetryGeneration++;
            ViewSendRetryScheduled = false;
            ViewResyncRetryGeneration++;
            ViewResyncRetryScheduled = false;
            ViewResyncRetryCapabilitySeq = 0;
            ViewReplacementContentStarted = false;
        }

        public void CommitViewDocument()
        {
            ViewDocumentCommitted = true;
            InterruptedViewDocument = null;
        }

        public bool RestoreInterruptedViewDocument(ViewDocumentSessionSnapshot snapshot)
        {
            if (snapshot == null || !object.ReferenceEquals(snapshot, InterruptedViewDocument)
                || ViewDocumentCommitted || ViewReplacementContentStarted) return false;
            ViewDocumentEpoch = snapshot.Epoch;
            ViewDocumentCommitted = true;
            StrictViewSession = true;
            ViewSessionId = snapshot.SessionId;
            ViewMountOrdinal = snapshot.MountOrdinal;
            ViewCapabilitySeq = snapshot.CapabilitySeq;
            ViewRevision = Math.Max(ViewRevision, snapshot.ViewRevision);
            CurrentUrl = snapshot.Url;
            _issuedViewSessions.Clear();
            IssueViewSession(snapshot.SessionId, snapshot.MountOrdinal);
            InterruptedViewDocument = null;
            return true;
        }

        private static string ViewSessionKey(string id, int mountOrdinal)
        {
            return id + ":" + mountOrdinal;
        }

        public void IssueViewSession(string id, int mountOrdinal)
        {
            if (_issuedViewSessions.Count >= 64)
            {
                _issuedViewSessions.Clear();
                if (StrictViewSession && !string.IsNullOrEmpty(ViewSessionId))
                    _issuedViewSessions.Add(ViewSessionKey(ViewSessionId, ViewMountOrdinal));
            }
            _issuedViewSessions.Add(ViewSessionKey(id, mountOrdinal));
        }

        public bool HasIssuedViewSession(string id, int mountOrdinal)
        {
            return !string.IsNullOrEmpty(id)
                && _issuedViewSessions.Contains(ViewSessionKey(id, mountOrdinal));
        }

        public void ResetWorkspaceBridge()
        {
            WorkspaceBridgeReady = false;
            AvailableSurfaces.Clear();
            if (_perfMetrics != null)
                _perfMetrics.Count(WorkspacePerfCounter.PendingRequestCleared, PendingWorkspaceRequests.Count);
            PendingWorkspaceRequests.Clear();
        }

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
                var environmentStarted = _perfMetrics == null ? 0 : Stopwatch.GetTimestamp();
                CoreWebView2Environment environment;
                try
                {
                    environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                }
                finally
                {
                    if (_perfMetrics != null)
                        _perfMetrics.Observe(WorkspacePerfSpan.EnvironmentCreate, environmentStarted);
                }
                if (_disposed || View == null)
                    throw new ObjectDisposedException("AccountPane");

                Environment = environment;
                var controllerStarted = _perfMetrics == null ? 0 : Stopwatch.GetTimestamp();
                try
                {
                    await View.EnsureCoreWebView2Async(Environment);
                }
                finally
                {
                    if (_perfMetrics != null)
                        _perfMetrics.Observe(WorkspacePerfSpan.ControllerInitialize, controllerStarted);
                }
            }
            catch
            {
                _initializationTask = null;
                throw;
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            var started = _perfMetrics == null ? 0 : Stopwatch.GetTimestamp();
            if (_perfMetrics != null)
                _perfMetrics.Count(WorkspacePerfCounter.PendingRequestCleared, PendingWorkspaceRequests.Count);
            try
            {
                if (EvidenceCapture != null)
                {
                    EvidenceCapture.Dispose();
                    EvidenceCapture = null;
                }
                if (View != null)
                {
                    View.Dispose();
                    View = null;
                }

                Environment = null;
            }
            finally
            {
                if (_perfMetrics != null)
                {
                    _perfMetrics.Observe(WorkspacePerfSpan.PaneDispose, started);
                    _perfMetrics.Count(WorkspacePerfCounter.PaneDisposed);
                }
            }
        }
    }
}
