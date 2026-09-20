using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PokePixel.CoupledWorkspace
{
    internal sealed class BetterUiFlowLayoutPanel : FlowLayoutPanel
    {
        private const int ScrollbarWidth = 10;
        private const int MinimumThumbHeight = 24;
        private const int SbHorz = 0;
        private const int SbVert = 1;

        private bool _draggingThumb;
        private int _dragOffsetY;
        private bool _hoveringThumb;

        [DllImport("user32.dll")]
        private static extern bool ShowScrollBar(IntPtr hWnd, int wBar, bool bShow);

        public BetterUiFlowLayoutPanel()
        {
            DoubleBuffered = true;
            AutoScroll = true;
            Padding = new Padding(8, 8, 18, 8);
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            HideNativeScrollbars();
        }

        protected override void OnLayout(LayoutEventArgs levent)
        {
            base.OnLayout(levent);
            HideNativeScrollbars();
            InvalidateScrollbar();
        }

        protected override void OnScroll(ScrollEventArgs se)
        {
            base.OnScroll(se);
            HideNativeScrollbars();
            InvalidateScrollbar();
        }

        protected override void OnMouseWheel(MouseEventArgs e)
        {
            base.OnMouseWheel(e);
            HideNativeScrollbars();
            InvalidateScrollbar();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            DrawBetterUiScrollbar(e.Graphics);
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            var track = GetTrackRectangle();
            if (e.Button == MouseButtons.Left && track.Contains(e.Location) && HasVerticalOverflow())
            {
                var thumb = GetThumbRectangle();
                if (thumb.Contains(e.Location))
                {
                    _draggingThumb = true;
                    _dragOffsetY = e.Y - thumb.Y;
                    Capture = true;
                }
                else
                {
                    ScrollToThumbTop(e.Y - (thumb.Height / 2));
                }
                InvalidateScrollbar();
                return;
            }

            base.OnMouseDown(e);
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            if (_draggingThumb)
            {
                ScrollToThumbTop(e.Y - _dragOffsetY);
                return;
            }

            var hovering = HasVerticalOverflow() && GetThumbRectangle().Contains(e.Location);
            if (hovering != _hoveringThumb)
            {
                _hoveringThumb = hovering;
                Cursor = hovering ? Cursors.Hand : Cursors.Default;
                InvalidateScrollbar();
            }
            base.OnMouseMove(e);
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            if (_draggingThumb && e.Button == MouseButtons.Left)
            {
                _draggingThumb = false;
                Capture = false;
                InvalidateScrollbar();
            }
            base.OnMouseUp(e);
        }

        protected override void OnMouseCaptureChanged(EventArgs e)
        {
            if (_draggingThumb && !Capture)
            {
                _draggingThumb = false;
                _dragOffsetY = 0;
                _hoveringThumb = false;
                Cursor = Cursors.Default;
                InvalidateScrollbar();
            }
            base.OnMouseCaptureChanged(e);
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            if (!_draggingThumb && _hoveringThumb)
            {
                _hoveringThumb = false;
                Cursor = Cursors.Default;
                InvalidateScrollbar();
            }
            base.OnMouseLeave(e);
        }

        private void HideNativeScrollbars()
        {
            if (!IsHandleCreated) return;
            ShowScrollBar(Handle, SbHorz, false);
            ShowScrollBar(Handle, SbVert, false);
        }

        private bool HasVerticalOverflow()
        {
            return DisplayRectangle.Height > ClientSize.Height;
        }

        private int GetMaximumScrollValue()
        {
            return Math.Max(0, DisplayRectangle.Height - ClientSize.Height);
        }

        private Rectangle GetTrackRectangle()
        {
            return new Rectangle(
                Math.Max(0, ClientSize.Width - ScrollbarWidth),
                0,
                ScrollbarWidth,
                Math.Max(0, ClientSize.Height)
            );
        }

        private Rectangle GetThumbRectangle()
        {
            var track = GetTrackRectangle();
            if (!HasVerticalOverflow() || track.Height <= 0)
                return Rectangle.Empty;

            var contentHeight = Math.Max(ClientSize.Height, DisplayRectangle.Height);
            var thumbHeight = Math.Max(
                MinimumThumbHeight,
                (int)Math.Round((double)track.Height * ClientSize.Height / contentHeight)
            );
            thumbHeight = Math.Min(track.Height, thumbHeight);
            var travel = Math.Max(0, track.Height - thumbHeight);
            var maximum = GetMaximumScrollValue();
            var current = Math.Max(0, -AutoScrollPosition.Y);
            var thumbTop = maximum <= 0
                ? 0
                : (int)Math.Round((double)current * travel / maximum);
            return new Rectangle(track.X, thumbTop, track.Width, thumbHeight);
        }

        private void ScrollToThumbTop(int requestedTop)
        {
            var track = GetTrackRectangle();
            var thumb = GetThumbRectangle();
            var travel = Math.Max(0, track.Height - thumb.Height);
            var maximum = GetMaximumScrollValue();
            if (travel <= 0 || maximum <= 0) return;

            var top = Math.Max(0, Math.Min(travel, requestedTop));
            var value = (int)Math.Round((double)top * maximum / travel);
            AutoScrollPosition = new Point(0, value);
            HideNativeScrollbars();
            InvalidateScrollbar();
        }

        private void DrawBetterUiScrollbar(Graphics graphics)
        {
            var track = GetTrackRectangle();
            using (var trackBrush = new SolidBrush(Color.FromArgb(0x23, 0x22, 0x28)))
                graphics.FillRectangle(trackBrush, track);

            if (!HasVerticalOverflow()) return;

            var thumb = GetThumbRectangle();
            var thumbColor = _hoveringThumb || _draggingThumb
                ? Color.FromArgb(0x87, 0x85, 0x73)
                : Color.FromArgb(0x5F, 0x58, 0x54);
            using (var thumbBrush = new SolidBrush(thumbColor))
                graphics.FillRectangle(thumbBrush, thumb);
        }

        private void InvalidateScrollbar()
        {
            Invalidate(GetTrackRectangle());
        }
    }

    internal sealed class MaintenanceDrawerForm : Form
    {
        public Func<Keys, bool> DialogKeyHandler { get; set; }

        protected override bool ProcessDialogKey(Keys keyData)
        {
            var handler = DialogKeyHandler;
            if (handler != null && handler(keyData)) return true;
            return base.ProcessDialogKey(keyData);
        }

        internal bool ProcessDialogKeyForSmoke(Keys keyData)
        {
            return ProcessDialogKey(keyData);
        }
    }

    internal sealed class WorkspaceForm : Form
    {
        private const string TargetUrl = "https://pokepixel.nietore.com/play/";
        private const string TargetOrigin = "https://pokepixel.nietore.com";

        private readonly string _baseDir;
        private readonly bool _smokeMode;
        private readonly WorkspaceState _workspaceState;
        private readonly WorkspaceSettingsStore _settingsStore;
        private readonly string _dataRoot;
        private readonly Dictionary<string, AccountPane> _panesByProfile =
            new Dictionary<string, AccountPane>(StringComparer.OrdinalIgnoreCase);
        private readonly SplitContainer _split;
        private readonly Panel _leftHost;
        private readonly Panel _rightHost;
        private readonly TableLayoutPanel _rootLayout;
        private readonly Label _leftStatus;
        private readonly Label _rightStatus;
        private readonly System.Windows.Forms.Timer _smokeTimer;
        private readonly SemaphoreSlim _workspaceMutationGate = new SemaphoreSlim(1, 1);
        private Panel _commandDeck;
        private FlowLayoutPanel _leftCommandGroup;
        private FlowLayoutPanel _rightCommandGroup;
        private Button _singleModeButton;
        private Button _dualModeButton;
        private ComboBox _singleProfileSelector;
        private Label _singleStatus;
        private FlowLayoutPanel _dualLayoutGroup;
        private Button _leftAccountButton;
        private Button _rightAccountButton;
        private Button _layout12Button;
        private Button _layout11Button;
        private Button _layout21Button;
        private Button _swapButton;
        private Button _focusButton;
        private Label _activeProfileLabel;
        private ComboBox _scopeSelector;
        private Button _homeButton;
        private Button _reloadButton;
        private Button _maintenanceButton;
        private Form _maintenanceDrawer;
        private Panel _maintenanceDrawerSurface;
        private FlowLayoutPanel _maintenanceDrawerBody;
        private Label _drawerSessionLabel;
        private Label _drawerBetterUiLabel;
        private Label _drawerRuntimeLabel;
        private Label _drawerErrorLabel;
        private Button _drawerRecoverButton;
        private Button _drawerHomeButton;
        private Button _drawerReloadButton;
        private Button _drawerDevToolsButton;
        private Button _drawerCopyButton;
        private Button _drawerResetLayoutButton;
        private string _betterUiScript;
        private bool _applyingLayout;
        private bool _updatingCommandDeck;
        private DateTime _maintenanceDrawerAutoClosedAtUtc = DateTime.MinValue;

        public WorkspaceForm(string baseDir, bool smokeMode)
        {
            _baseDir = baseDir;
            _smokeMode = smokeMode;
            ProfileRegistry.Validate();
            var stateRoot = _smokeMode
                ? Path.Combine(_baseDir, "smoke", "runtime-state")
                : Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "PokePixelCoupledWorkspace"
                );
            Directory.CreateDirectory(stateRoot);
            _dataRoot = _smokeMode
                ? Path.Combine(_baseDir, "smoke-user-data")
                : stateRoot;
            Directory.CreateDirectory(_dataRoot);
            _settingsStore = new WorkspaceSettingsStore(Path.Combine(stateRoot, "workspace.json"));
            _workspaceState = _smokeMode
                ? WorkspaceState.CreateBaseline()
                : _settingsStore.LoadOrDefault();

            Text = "PokePixel Coupled Workspace — WebView2";
            BackColor = Color.FromArgb(0x23, 0x22, 0x28);
            ForeColor = Color.FromArgb(0xEB, 0xEC, 0xDC);
            Width = 1600;
            Height = 960;
            MinimumSize = new Size(1180, 600);
            StartPosition = FormStartPosition.CenterScreen;
            Font = new Font(FontFamily.GenericMonospace, 9.0f, FontStyle.Regular);

            if (_smokeMode)
            {
                ShowInTaskbar = false;
                Opacity = 0;
            }

            var root = new TableLayoutPanel();
            _rootLayout = root;
            root.Dock = DockStyle.Fill;
            root.RowCount = 2;
            root.ColumnCount = 1;
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            root.BackColor = BackColor;
            Controls.Add(root);

            var toolbar = BuildToolbar(out _leftStatus, out _rightStatus);
            root.Controls.Add(toolbar, 0, 0);
            UpdateCommandDeck();
            LayoutCommandDeck();
            _commandDeck.Enabled = false;

            _split = new SplitContainer();
            _split.Dock = DockStyle.Fill;
            _split.Orientation = Orientation.Vertical;
            _split.SplitterWidth = 8;
            _split.BackColor = Color.FromArgb(0x5F, 0x58, 0x54);
            _split.SplitterMoving += delegate(object sender, SplitterCancelEventArgs args)
            {
                BoundSplitterMovement(args);
            };
            _split.SplitterMoved += delegate
            {
                if (!_applyingLayout) HandleReleasedSplitter();
            };
            root.Controls.Add(_split, 0, 1);

            _leftHost = CreatePaneHost();
            _rightHost = CreatePaneHost();
            _split.Panel1.Controls.Add(_leftHost);
            _split.Panel2.Controls.Add(_rightHost);

            Shown += async delegate
            {
                await RunWorkspaceMutationAsync(InitializeAsync);
            };
            FormClosed += delegate
            {
                if (_maintenanceDrawer != null && !_maintenanceDrawer.IsDisposed)
                    _maintenanceDrawer.Close();
                if (!_smokeMode) PersistWorkspaceState();
                foreach (var pane in new List<AccountPane>(_panesByProfile.Values))
                    pane.Dispose();
                _panesByProfile.Clear();
            };
            Resize += delegate
            {
                if (_maintenanceDrawer != null && _maintenanceDrawer.Visible)
                    PositionMaintenanceDrawer();
            };
            LocationChanged += delegate
            {
                if (_maintenanceDrawer != null && _maintenanceDrawer.Visible)
                    PositionMaintenanceDrawer();
            };

            _smokeTimer = new System.Windows.Forms.Timer();
            _smokeTimer.Interval = 12000;
            _smokeTimer.Tick += delegate
            {
                _smokeTimer.Stop();
                if (_smokeMode)
                {
                    Console.Error.WriteLine("WebView2 smoke timed out.");
                    Environment.ExitCode = 1;
                    Close();
                }
            };
        }

        private Panel BuildToolbar(out Label leftStatus, out Label rightStatus)
        {
            var toolbar = new Panel();
            _commandDeck = toolbar;
            toolbar.Dock = DockStyle.Fill;
            toolbar.BackColor = BackColor;
            toolbar.Padding = new Padding(8, 6, 8, 6);

            var leftGroup = MakeToolbarGroup();
            _leftCommandGroup = leftGroup;
            leftGroup.Dock = DockStyle.Left;

            _singleModeButton = MakeButton("1 ACC", 58, 0);
            _dualModeButton = MakeButton("2 ACC", 58, 0);
            leftGroup.Controls.Add(_singleModeButton);
            leftGroup.Controls.Add(_dualModeButton);

            _singleProfileSelector = MakeComboBox(92);
            _singleProfileSelector.AccessibleName = "Account profile";
            foreach (var profile in ProfileRegistry.All())
                _singleProfileSelector.Items.Add(profile);
            leftGroup.Controls.Add(_singleProfileSelector);
            _singleStatus = MakeLabel("Starting", 66);
            _singleStatus.Margin = new Padding(4, 6, 0, 0);
            leftGroup.Controls.Add(_singleStatus);
            toolbar.Controls.Add(leftGroup);

            _dualLayoutGroup = MakeToolbarGroup();
            _dualLayoutGroup.Top = 6;

            _leftAccountButton = MakeButton("Rhyxus", 104, 0);
            leftStatus = MakeLabel("Starting", 62);
            leftStatus.Margin = new Padding(2, 6, 4, 0);
            _layout12Button = MakeButton("1:2", 44, 0);
            _layout11Button = MakeButton("1:1", 44, 0);
            _layout21Button = MakeButton("2:1", 44, 0);
            _swapButton = MakeButton("Swap", 52, 0);
            _focusButton = MakeButton("Focus", 62, 0);
            _rightAccountButton = MakeButton("Rhyosa", 104, 0);
            rightStatus = MakeLabel("Starting", 62);
            rightStatus.Margin = new Padding(2, 6, 0, 0);

            _dualLayoutGroup.Controls.Add(_leftAccountButton);
            _dualLayoutGroup.Controls.Add(leftStatus);
            _dualLayoutGroup.Controls.Add(_layout12Button);
            _dualLayoutGroup.Controls.Add(_layout11Button);
            _dualLayoutGroup.Controls.Add(_layout21Button);
            _dualLayoutGroup.Controls.Add(_swapButton);
            _dualLayoutGroup.Controls.Add(_focusButton);
            _dualLayoutGroup.Controls.Add(_rightAccountButton);
            _dualLayoutGroup.Controls.Add(rightStatus);
            toolbar.Controls.Add(_dualLayoutGroup);

            var rightGroup = MakeToolbarGroup();
            _rightCommandGroup = rightGroup;
            rightGroup.Dock = DockStyle.Right;

            _activeProfileLabel = MakeLabel("ACTIVE: RHYXUS", 116);
            _activeProfileLabel.Margin = new Padding(0, 6, 2, 0);
            _scopeSelector = MakeComboBox(74);
            _scopeSelector.AccessibleName = "Command scope";
            _scopeSelector.Items.Add("Active");
            _scopeSelector.Items.Add("Both");
            _homeButton = MakeButton("Home", 58, 0);
            _reloadButton = MakeButton("Reload", 66, 0);
            _maintenanceButton = MakeButton("⋯", 30, 0);
            _maintenanceButton.AccessibleName = "Maintenance";

            rightGroup.Controls.Add(_activeProfileLabel);
            rightGroup.Controls.Add(_scopeSelector);
            rightGroup.Controls.Add(_homeButton);
            rightGroup.Controls.Add(_reloadButton);
            rightGroup.Controls.Add(_maintenanceButton);
            toolbar.Controls.Add(rightGroup);

            _singleModeButton.Click += async delegate
            {
                await RunWorkspaceMutationAsync(delegate
                {
                    return SwitchToSingleAsync(_workspaceState.ActiveProfileId);
                });
                UpdateCommandDeck();
            };
            _dualModeButton.Click += async delegate
            {
                await RunWorkspaceMutationAsync(SwitchToDualAsync);
                UpdateCommandDeck();
            };
            _singleProfileSelector.SelectedIndexChanged += async delegate
            {
                if (_updatingCommandDeck || _workspaceState.Mode != WorkspaceMode.Single) return;
                var profile = _singleProfileSelector.SelectedItem as ProfileDefinition;
                if (profile == null) return;
                await RunWorkspaceMutationAsync(delegate
                {
                    return SwitchSingleProfileAsync(profile.Id);
                });
                UpdateCommandDeck();
            };

            _leftAccountButton.Click += async delegate
            {
                await RunWorkspaceMutationAsync(delegate
                {
                    SetActiveProfile(_workspaceState.LeftProfileId);
                    return Task.FromResult(0);
                });
            };
            _rightAccountButton.Click += async delegate
            {
                await RunWorkspaceMutationAsync(delegate
                {
                    SetActiveProfile(_workspaceState.RightProfileId);
                    return Task.FromResult(0);
                });
            };
            _layout12Button.Click += async delegate
            {
                await RunWorkspaceMutationAsync(delegate
                {
                    ApplyLayoutPreset(1.0 / 3.0);
                    return Task.FromResult(0);
                });
                UpdateCommandDeck();
            };
            _layout11Button.Click += async delegate
            {
                await RunWorkspaceMutationAsync(delegate
                {
                    ApplyLayoutPreset(0.5);
                    return Task.FromResult(0);
                });
                UpdateCommandDeck();
            };
            _layout21Button.Click += async delegate
            {
                await RunWorkspaceMutationAsync(delegate
                {
                    ApplyLayoutPreset(2.0 / 3.0);
                    return Task.FromResult(0);
                });
                UpdateCommandDeck();
            };
            _swapButton.Click += async delegate
            {
                await RunWorkspaceMutationAsync(delegate
                {
                    SwapPanes();
                    return Task.FromResult(0);
                });
                UpdateCommandDeck();
            };
            _focusButton.Click += async delegate
            {
                await RunWorkspaceMutationAsync(delegate
                {
                    if (_workspaceState.FocusMode) RestoreFocusMode();
                    else EnterFocusMode();
                    return Task.FromResult(0);
                });
                UpdateCommandDeck();
            };
            _scopeSelector.SelectedIndexChanged += delegate
            {
                if (_updatingCommandDeck) return;
                _workspaceState.CommandScope = _scopeSelector.SelectedIndex == 1
                    ? CommandScope.Both
                    : CommandScope.Active;
                if (!_smokeMode) PersistWorkspaceState();
                UpdateCommandDeck();
            };
            _homeButton.Click += delegate
            {
                ExecuteScopedCommand(delegate(AccountPane pane) { NavigateHome(pane.View); });
            };
            _reloadButton.Click += delegate
            {
                ExecuteScopedCommand(delegate(AccountPane pane)
                {
                    if (pane.View.CoreWebView2 != null) pane.View.CoreWebView2.Reload();
                });
            };
            _maintenanceButton.Click += delegate
            {
                if ((DateTime.UtcNow - _maintenanceDrawerAutoClosedAtUtc).TotalMilliseconds < 250)
                    return;
                ToggleMaintenanceDrawer();
            };

            toolbar.Resize += delegate { LayoutCommandDeck(); };

            return toolbar;
        }

        private static FlowLayoutPanel MakeToolbarGroup()
        {
            var group = new FlowLayoutPanel();
            group.AutoSize = true;
            group.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            group.WrapContents = false;
            group.Height = 32;
            group.Margin = new Padding(0);
            group.Padding = new Padding(0);
            return group;
        }

        private ComboBox MakeComboBox(int width)
        {
            var combo = new ComboBox();
            combo.Width = width;
            combo.Height = 28;
            combo.DropDownStyle = ComboBoxStyle.DropDownList;
            combo.FlatStyle = FlatStyle.Flat;
            combo.BackColor = Color.FromArgb(0x23, 0x22, 0x28);
            combo.ForeColor = Color.FromArgb(0xEB, 0xEC, 0xDC);
            combo.Font = Font;
            combo.Margin = new Padding(4, 0, 0, 0);
            return combo;
        }

        private void LayoutCommandDeck()
        {
            if (_dualLayoutGroup == null
                || _commandDeck == null
                || _leftCommandGroup == null
                || _rightCommandGroup == null
                || _leftStatus == null
                || _rightStatus == null)
                return;

            var leftEdge = _leftCommandGroup.Right + 8;
            var rightEdge = _rightCommandGroup.Left - 8;
            _dualLayoutGroup.Left = Math.Max(
                leftEdge,
                leftEdge + Math.Max(0, rightEdge - leftEdge - _dualLayoutGroup.Width) / 2
            );
            _dualLayoutGroup.Top = 6;

            var compact = _commandDeck.ClientSize.Width < 1280;
            var dual = _workspaceState.Mode == WorkspaceMode.Dual;
            var focusMode = dual && _workspaceState.FocusMode;
            var activeOnLeft = dual && string.Equals(
                _workspaceState.ActiveProfileId,
                _workspaceState.LeftProfileId,
                StringComparison.OrdinalIgnoreCase
            );
            _leftStatus.Visible = !compact && dual && (!focusMode || activeOnLeft);
            _rightStatus.Visible = !compact && dual && (!focusMode || !activeOnLeft);
            _activeProfileLabel.Visible = dual
                && !focusMode
                && _commandDeck.ClientSize.Width >= 1200;
        }

        private void SetButtonSelected(Button button, bool selected)
        {
            if (button == null) return;
            var gold = Color.FromArgb(0xE3, 0xC0, 0x54);
            var cyan = Color.FromArgb(0x54, 0xBA, 0xD2);
            var stone = Color.FromArgb(0x5F, 0x58, 0x54);
            button.Tag = selected;
            button.FlatAppearance.BorderColor = button.Focused
                ? cyan
                : selected ? gold : stone;
            button.BackColor = selected
                ? stone
                : Color.FromArgb(0x23, 0x22, 0x28);
            button.ForeColor = selected ? gold : ForeColor;
        }

        private void UpdateCommandDeck()
        {
            if (_singleModeButton == null) return;
            _updatingCommandDeck = true;
            try
            {
                var single = _workspaceState.Mode == WorkspaceMode.Single;
                var focusMode = !single && _workspaceState.FocusMode;
                SetButtonSelected(_singleModeButton, single);
                SetButtonSelected(_dualModeButton, !single);
                _singleModeButton.Visible = !focusMode;
                _dualModeButton.Visible = !focusMode;
                _singleProfileSelector.Visible = single;
                _singleStatus.Visible = single;
                _dualLayoutGroup.Visible = !single;
                _scopeSelector.Visible = !single;

                var singleProfile = ProfileRegistry.Get(_workspaceState.SingleProfileId);
                _singleProfileSelector.SelectedItem = singleProfile;

                var leftActive = !single && string.Equals(
                    _workspaceState.ActiveProfileId,
                    _workspaceState.LeftProfileId,
                    StringComparison.OrdinalIgnoreCase
                );
                var rightActive = !single && string.Equals(
                    _workspaceState.ActiveProfileId,
                    _workspaceState.RightProfileId,
                    StringComparison.OrdinalIgnoreCase
                );
                var compactActiveCue = _commandDeck != null && _commandDeck.ClientSize.Width < 1200;
                var inlineActiveCue = compactActiveCue || focusMode;
                var leftName = ProfileRegistry.Get(_workspaceState.LeftProfileId).DisplayName;
                var rightName = ProfileRegistry.Get(_workspaceState.RightProfileId).DisplayName;
                _leftAccountButton.Text = inlineActiveCue && leftActive
                    ? "ACTIVE " + leftName
                    : leftName;
                _rightAccountButton.Text = inlineActiveCue && rightActive
                    ? "ACTIVE " + rightName
                    : rightName;
                _leftAccountButton.AccessibleName = leftActive
                    ? "Active account " + leftName
                    : "Account " + leftName;
                _rightAccountButton.AccessibleName = rightActive
                    ? "Active account " + rightName
                    : "Account " + rightName;
                SetButtonSelected(
                    _leftAccountButton,
                    leftActive
                );
                SetButtonSelected(
                    _rightAccountButton,
                    rightActive
                );

                SetButtonSelected(_layout12Button, IsCurrentLayoutPreset(1.0 / 3.0));
                SetButtonSelected(_layout11Button, IsCurrentLayoutPreset(0.5));
                SetButtonSelected(_layout21Button, IsCurrentLayoutPreset(2.0 / 3.0));
                _focusButton.Text = _workspaceState.FocusMode ? "Restore" : "Focus";
                _focusButton.AccessibleName = _workspaceState.FocusMode
                    ? "Restore dual layout"
                    : "Focus active account";
                _layout12Button.Visible = !single && !_workspaceState.FocusMode;
                _layout11Button.Visible = !single && !_workspaceState.FocusMode;
                _layout21Button.Visible = !single && !_workspaceState.FocusMode;
                _swapButton.Visible = !single && !_workspaceState.FocusMode;
                _leftAccountButton.Visible = !single && (!_workspaceState.FocusMode || leftActive);
                _rightAccountButton.Visible = !single && (!_workspaceState.FocusMode || rightActive);

                var activeProfile = ProfileRegistry.Get(_workspaceState.ActiveProfileId);
                _activeProfileLabel.Text = "ACTIVE: " + activeProfile.DisplayName.ToUpperInvariant();
                _scopeSelector.SelectedIndex = _workspaceState.CommandScope == CommandScope.Both ? 1 : 0;
                UpdatePaneRails();
            }
            finally
            {
                _updatingCommandDeck = false;
            }
            LayoutCommandDeck();
        }

        private void SetActiveProfile(string profileId)
        {
            ProfileDefinition profile;
            if (!ProfileRegistry.TryGet(profileId, out profile)) return;

            if (_workspaceState.Mode == WorkspaceMode.Single)
            {
                if (!string.Equals(
                    _workspaceState.SingleProfileId,
                    profile.Id,
                    StringComparison.OrdinalIgnoreCase
                ))
                    return;
            }
            else if (!string.Equals(
                    _workspaceState.LeftProfileId,
                    profile.Id,
                    StringComparison.OrdinalIgnoreCase
                )
                && !string.Equals(
                    _workspaceState.RightProfileId,
                    profile.Id,
                    StringComparison.OrdinalIgnoreCase
                ))
            {
                return;
            }

            _workspaceState.ActiveProfileId = profile.Id;
            if (_workspaceState.FocusMode) ApplyFocusLayout();
            if (!_smokeMode) PersistWorkspaceState();
            UpdateCommandDeck();
        }

        private void ExecuteScopedCommand(Action<AccountPane> command)
        {
            if (command == null) return;

            if (_workspaceState.CommandScope == CommandScope.Both
                && _workspaceState.Mode == WorkspaceMode.Dual)
            {
                var left = GetPaneForSide(PaneSide.Left);
                var right = GetPaneForSide(PaneSide.Right);
                if (left != null) command(left);
                if (right != null && !object.ReferenceEquals(left, right)) command(right);
                return;
            }

            var active = GetPaneForProfile(_workspaceState.ActiveProfileId);
            if (active != null) command(active);
        }

        private void ToggleMaintenanceDrawer()
        {
            if (_maintenanceDrawer == null || _maintenanceDrawer.IsDisposed)
                _maintenanceDrawer = CreateMaintenanceDrawer();

            if (_maintenanceDrawer.Visible)
            {
                HideMaintenanceDrawer();
                return;
            }

            RefreshMaintenanceDrawer();
            PositionMaintenanceDrawer();
            _maintenanceDrawer.Show(this);
            _maintenanceDrawer.BringToFront();
            _workspaceState.MaintenanceDrawerExpanded = true;
            if (!_smokeMode) PersistWorkspaceState();
            if (_drawerRecoverButton != null) _drawerRecoverButton.Focus();
        }

        private Form CreateMaintenanceDrawer()
        {
            var drawer = new MaintenanceDrawerForm();
            drawer.FormBorderStyle = FormBorderStyle.None;
            drawer.ShowInTaskbar = false;
            drawer.StartPosition = FormStartPosition.Manual;
            drawer.Width = 360;
            drawer.Height = 430;
            drawer.MinimumSize = new Size(360, 220);
            drawer.MaximumSize = new Size(360, 480);
            drawer.BackColor = Color.FromArgb(0x5F, 0x58, 0x54);
            drawer.ForeColor = ForeColor;
            drawer.Font = Font;
            drawer.KeyPreview = true;
            drawer.Padding = new Padding(0);

            var surface = new Panel();
            surface.Dock = DockStyle.Fill;
            surface.BackColor = Color.FromArgb(0x5F, 0x58, 0x54);
            surface.Padding = new Padding(2);
            drawer.Controls.Add(surface);
            _maintenanceDrawerSurface = surface;

            var body = new BetterUiFlowLayoutPanel();
            body.Dock = DockStyle.Fill;
            body.FlowDirection = FlowDirection.TopDown;
            body.WrapContents = false;
            body.BackColor = Color.FromArgb(0x23, 0x22, 0x28);
            surface.Controls.Add(body);
            _maintenanceDrawerBody = body;

            body.Controls.Add(MakeDrawerHeading("SESSION"));
            _drawerSessionLabel = MakeDrawerText(326, 44);
            body.Controls.Add(_drawerSessionLabel);

            _drawerRecoverButton = MakeButton("Recover active pane", 154, 0);
            _drawerRecoverButton.Click += async delegate
            {
                await RunWorkspaceMutationAsync(RecoverActivePaneAsync);
                RefreshMaintenanceDrawer();
            };
            body.Controls.Add(_drawerRecoverButton);

            body.Controls.Add(MakeDrawerHeading("BETTER UI"));
            _drawerBetterUiLabel = MakeDrawerText(326, 44);
            body.Controls.Add(_drawerBetterUiLabel);

            body.Controls.Add(MakeDrawerHeading("BROWSER"));
            var browserRow = MakeToolbarGroup();
            _drawerHomeButton = MakeButton("Home", 74, 0);
            _drawerReloadButton = MakeButton("Reload", 82, 0);
            _drawerDevToolsButton = MakeButton("DevTools", 94, 0);
            browserRow.Controls.Add(_drawerHomeButton);
            browserRow.Controls.Add(_drawerReloadButton);
            browserRow.Controls.Add(_drawerDevToolsButton);
            body.Controls.Add(browserRow);

            _drawerHomeButton.Click += delegate
            {
                ExecuteScopedCommand(delegate(AccountPane pane) { NavigateHome(pane.View); });
            };
            _drawerReloadButton.Click += delegate
            {
                ExecuteScopedCommand(delegate(AccountPane pane)
                {
                    if (pane.View.CoreWebView2 != null) pane.View.CoreWebView2.Reload();
                });
            };
            _drawerDevToolsButton.Click += delegate
            {
                var pane = GetPaneForProfile(_workspaceState.ActiveProfileId);
                if (pane != null && pane.View.CoreWebView2 != null)
                    pane.View.CoreWebView2.OpenDevToolsWindow();
            };

            body.Controls.Add(MakeDrawerHeading("RUNTIME"));
            _drawerRuntimeLabel = MakeDrawerText(326, 44);
            body.Controls.Add(_drawerRuntimeLabel);

            body.Controls.Add(MakeDrawerHeading("ERRORS"));
            _drawerErrorLabel = MakeDrawerText(326, 70);
            body.Controls.Add(_drawerErrorLabel);

            _drawerCopyButton = MakeButton("Copy diagnostics", 146, 0);
            _drawerCopyButton.Click += delegate { CopyDiagnostics(); };
            body.Controls.Add(_drawerCopyButton);

            body.Controls.Add(MakeDrawerHeading("WORKSPACE"));
            _drawerResetLayoutButton = MakeButton("Reset layout", 122, 0);
            _drawerResetLayoutButton.Click += delegate
            {
                ResetWorkspaceLayout();
                RefreshMaintenanceDrawer();
            };
            body.Controls.Add(_drawerResetLayoutButton);

            drawer.DialogKeyHandler = HandleMaintenanceDrawerDialogKey;

            drawer.KeyDown += delegate(object sender, KeyEventArgs args)
            {
                if (args.KeyCode == Keys.Escape)
                {
                    args.Handled = true;
                    args.SuppressKeyPress = true;
                    HideMaintenanceDrawer();
                    return;
                }
            };
            drawer.Deactivate += delegate
            {
                if (drawer.Visible)
                {
                    _maintenanceDrawerAutoClosedAtUtc = DateTime.UtcNow;
                    HideMaintenanceDrawer();
                }
            };

            return drawer;
        }

        private bool HandleMaintenanceDrawerDialogKey(Keys keyData)
        {
            if ((keyData & Keys.KeyCode) != Keys.Tab) return false;

            var shift = (keyData & Keys.Shift) == Keys.Shift;
            if (!shift
                && _drawerResetLayoutButton != null
                && _drawerResetLayoutButton.Focused)
            {
                ExitMaintenanceDrawerTabBoundary(true);
                return true;
            }

            if (shift
                && _drawerRecoverButton != null
                && _drawerRecoverButton.Focused)
            {
                ExitMaintenanceDrawerTabBoundary(false);
                return true;
            }

            return false;
        }

        private void ExitMaintenanceDrawerTabBoundary(bool forward)
        {
            HideMaintenanceDrawer();
            BeginInvoke(new Action(delegate
            {
                if (IsDisposed || _maintenanceButton == null || _maintenanceButton.IsDisposed)
                    return;
                SelectNextControl(_maintenanceButton, forward, true, true, true);
            }));
        }

        private Label MakeDrawerHeading(string text)
        {
            var label = MakeLabel(text, 326);
            label.Height = 22;
            label.Margin = new Padding(0, 8, 0, 2);
            label.Font = new Font(Font, FontStyle.Bold);
            label.ForeColor = Color.FromArgb(0x54, 0xBA, 0xD2);
            return label;
        }

        private Label MakeDrawerText(int width, int height)
        {
            var label = MakeLabel("", width);
            label.Height = height;
            label.Margin = new Padding(0, 0, 0, 2);
            label.AutoEllipsis = true;
            return label;
        }

        private void PositionMaintenanceDrawer()
        {
            if (_maintenanceDrawer == null || _maintenanceButton == null) return;
            var trigger = _maintenanceButton.PointToScreen(
                new Point(_maintenanceButton.Width, _maintenanceButton.Height)
            );
            var working = Screen.FromControl(this).WorkingArea;
            var height = Math.Min(
                480,
                Math.Max(220, working.Bottom - trigger.Y - 8)
            );
            _maintenanceDrawer.Height = height;
            _maintenanceDrawer.Location = new Point(
                Math.Max(working.Left, Math.Min(working.Right - 360, trigger.X - 360)),
                Math.Max(working.Top, Math.Min(working.Bottom - height, trigger.Y))
            );
        }

        private void HideMaintenanceDrawer()
        {
            if (_maintenanceDrawer == null || !_maintenanceDrawer.Visible) return;
            _maintenanceDrawer.Hide();
            _workspaceState.MaintenanceDrawerExpanded = false;
            if (!_smokeMode) PersistWorkspaceState();
            if (_maintenanceButton != null && _maintenanceButton.CanFocus)
                _maintenanceButton.Focus();
        }

        private void RefreshMaintenanceDrawer()
        {
            if (_drawerSessionLabel == null) return;
            var active = GetPaneForProfile(_workspaceState.ActiveProfileId);
            var left = GetPaneForSide(PaneSide.Left);
            var right = GetPaneForSide(PaneSide.Right);

            _drawerSessionLabel.Text =
                "Mode: " + _workspaceState.Mode
                + "  Active: " + ProfileRegistry.Get(_workspaceState.ActiveProfileId).DisplayName
                + Environment.NewLine
                + "Left: " + (left == null ? "—" : left.Profile.DisplayName)
                + "  Right: " + (right == null ? "—" : right.Profile.DisplayName);

            _drawerBetterUiLabel.Text =
                "Active health: " + (active == null ? "Unavailable" : active.HealthText)
                + Environment.NewLine
                + "Injection: " + (active != null && active.HealthState == PaneHealthState.UiReady
                    ? "post-success ready"
                    : "not confirmed");

            string runtimeVersion;
            try
            {
                runtimeVersion = CoreWebView2Environment.GetAvailableBrowserVersionString();
            }
            catch (Exception ex)
            {
                runtimeVersion = "Unavailable: " + ex.Message;
            }
            _drawerRuntimeLabel.Text =
                "WebView2: " + runtimeVersion + Environment.NewLine
                + "SDK: 1.0.4191.47";

            _drawerErrorLabel.Text = active == null || string.IsNullOrEmpty(active.LastErrorText)
                ? "No active-pane error."
                : active.LastErrorText;
        }

        private async Task RecoverActivePaneAsync()
        {
            var profileId = _workspaceState.ActiveProfileId;
            var profile = ProfileRegistry.Get(profileId);
            var targetHost = _workspaceState.Mode == WorkspaceMode.Single
                ? _leftHost
                : string.Equals(profileId, _workspaceState.LeftProfileId, StringComparison.OrdinalIgnoreCase)
                    ? _leftHost
                    : _rightHost;

            DisposePane(profile.Id);
            await EnsurePaneAsync(
                profile.Id,
                targetHost,
                GetStatusLabelForProfile(profile.Id)
            );
            UpdateCommandDeck();
        }

        private void CopyDiagnostics()
        {
            try
            {
                Clipboard.SetText(BuildDiagnosticsText());
            }
            catch (Exception ex)
            {
                if (_drawerErrorLabel != null)
                    _drawerErrorLabel.Text = "Clipboard error: " + ex.Message;
            }
        }

        private string BuildDiagnosticsText()
        {
            var lines = new List<string>();
            lines.Add("PokePixel Coupled Workspace");
            lines.Add("Mode=" + _workspaceState.Mode);
            lines.Add("ActiveProfile=" + _workspaceState.ActiveProfileId);
            lines.Add("LeftProfile=" + _workspaceState.LeftProfileId);
            lines.Add("RightProfile=" + _workspaceState.RightProfileId);
            lines.Add("Ratio=" + _workspaceState.LayoutRatio.ToString("0.000"));
            lines.Add("FocusMode=" + _workspaceState.FocusMode);
            lines.Add("CommandScope=" + _workspaceState.CommandScope);
            try
            {
                lines.Add("WebView2=" + CoreWebView2Environment.GetAvailableBrowserVersionString());
            }
            catch { }

            foreach (var profile in ProfileRegistry.All())
            {
                var pane = GetPaneForProfile(profile.Id);
                if (pane == null)
                {
                    lines.Add(profile.Id + ": not initialized");
                    continue;
                }
                lines.Add(
                    profile.Id
                    + ": health=" + pane.HealthText
                    + " url=" + SafeDiagnosticUrl(pane.CurrentUrl)
                    + " error=" + (pane.LastErrorText ?? "")
                );
            }
            return string.Join(Environment.NewLine, lines.ToArray());
        }

        private static string SafeDiagnosticUrl(string rawUrl)
        {
            Uri uri;
            if (string.IsNullOrWhiteSpace(rawUrl)
                || !Uri.TryCreate(rawUrl, UriKind.Absolute, out uri))
                return "";

            if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
                return uri.Scheme + ":";

            var host = uri.Host;
            if (host.IndexOf(':') >= 0 && !host.StartsWith("[", StringComparison.Ordinal))
                host = "[" + host + "]";
            var port = uri.IsDefaultPort ? "" : ":" + uri.Port;
            return uri.Scheme + "://" + host + port + uri.AbsolutePath;
        }

        private void ResetWorkspaceLayout()
        {
            _workspaceState.LayoutRatio = 0.5;
            _workspaceState.LastDualRatio = 0.5;
            _workspaceState.FocusMode = false;
            _workspaceState.CommandScope = CommandScope.Active;
            _workspaceState.ZoomByProfile[ProfileRegistry.Rhyxus.Id] = 1.0;
            _workspaceState.ZoomByProfile[ProfileRegistry.Rhyosa.Id] = 1.0;

            if (_workspaceState.Mode == WorkspaceMode.Dual)
            {
                _applyingLayout = true;
                try
                {
                    _split.Panel1Collapsed = false;
                    _split.Panel2Collapsed = false;
                }
                finally
                {
                    _applyingLayout = false;
                }
                SetSplitRatio(0.5);
            }

            if (!_smokeMode) PersistWorkspaceState();
            UpdateCommandDeck();
        }

        private Button MakeButton(string text, int width, int left)
        {
            var button = new Button();
            button.Text = text;
            button.Width = width;
            button.Height = 28;
            button.Left = left;
            button.Top = 6;
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderSize = 2;
            button.FlatAppearance.BorderColor = Color.FromArgb(0x5F, 0x58, 0x54);
            button.BackColor = BackColor;
            button.ForeColor = ForeColor;
            button.GotFocus += delegate
            {
                SetButtonSelected(button, button.Tag is bool && (bool)button.Tag);
            };
            button.LostFocus += delegate
            {
                if (!button.IsDisposed) UpdateCommandDeck();
            };
            return button;
        }

        private Label MakeLabel(string text, int width)
        {
            var label = new Label();
            label.Text = text;
            label.AutoSize = false;
            label.Width = width;
            label.Height = 20;
            label.ForeColor = ForeColor;
            label.BackColor = Color.Transparent;
            return label;
        }

        private static Panel CreatePaneHost()
        {
            var host = new Panel();
            host.Dock = DockStyle.Fill;
            host.Padding = new Padding(0, 2, 0, 0);
            host.BackColor = Color.FromArgb(0x87, 0x85, 0x73);
            return host;
        }

        private AccountPane GetPaneForProfile(string profileId)
        {
            AccountPane pane;
            return profileId != null && _panesByProfile.TryGetValue(profileId, out pane)
                ? pane
                : null;
        }

        private AccountPane GetPaneForSide(PaneSide side)
        {
            if (_workspaceState.Mode == WorkspaceMode.Single)
                return side == PaneSide.Left
                    ? GetPaneForProfile(_workspaceState.SingleProfileId)
                    : null;

            return GetPaneForProfile(
                side == PaneSide.Left
                    ? _workspaceState.LeftProfileId
                    : _workspaceState.RightProfileId
            );
        }

        private Label GetStatusLabelForProfile(string profileId)
        {
            if (_workspaceState.Mode == WorkspaceMode.Single)
                return string.Equals(
                    _workspaceState.SingleProfileId,
                    profileId,
                    StringComparison.OrdinalIgnoreCase
                )
                    ? _singleStatus
                    : null;

            if (string.Equals(_workspaceState.LeftProfileId, profileId, StringComparison.OrdinalIgnoreCase))
                return _leftStatus;
            if (string.Equals(_workspaceState.RightProfileId, profileId, StringComparison.OrdinalIgnoreCase))
                return _rightStatus;
            return null;
        }

        private void UpdatePaneRails()
        {
            if (_leftHost == null || _rightHost == null) return;
            var gold = Color.FromArgb(0xE3, 0xC0, 0x54);
            var neutral = Color.FromArgb(0x87, 0x85, 0x73);

            if (_workspaceState.Mode == WorkspaceMode.Single)
            {
                _leftHost.BackColor = gold;
                _rightHost.BackColor = neutral;
                return;
            }

            _leftHost.BackColor = string.Equals(
                _workspaceState.ActiveProfileId,
                _workspaceState.LeftProfileId,
                StringComparison.OrdinalIgnoreCase
            )
                ? gold
                : neutral;
            _rightHost.BackColor = string.Equals(
                _workspaceState.ActiveProfileId,
                _workspaceState.RightProfileId,
                StringComparison.OrdinalIgnoreCase
            )
                ? gold
                : neutral;
        }

        private Color HealthColor(PaneHealthState state)
        {
            switch (state)
            {
                case PaneHealthState.Ready:
                case PaneHealthState.UiReady:
                    return Color.FromArgb(0x55, 0xA0, 0x58);
                case PaneHealthState.Error:
                case PaneHealthState.ProcessFailed:
                case PaneHealthState.Blocked:
                    return Color.FromArgb(0xC6, 0x50, 0x46);
                default:
                    return ForeColor;
            }
        }

        private bool IsCurrentPane(AccountPane pane)
        {
            if (pane == null) return false;
            AccountPane current;
            return _panesByProfile.TryGetValue(pane.Profile.Id, out current)
                && object.ReferenceEquals(current, pane);
        }

        private void SetPaneHealth(AccountPane pane, PaneHealthState state, string text)
        {
            if (!IsCurrentPane(pane)) return;
            pane.HealthState = state;
            pane.HealthText = text;
            var status = GetStatusLabelForProfile(pane.Profile.Id);
            if (status == null) return;
            status.Text = text;
            status.ForeColor = HealthColor(state);
        }

        private void ApplyPaneHealthToCurrentLabel(AccountPane pane)
        {
            if (pane == null) return;
            SetPaneHealth(pane, pane.HealthState, pane.HealthText);
        }

        private static void AttachPane(AccountPane pane, Panel host)
        {
            if (pane == null || pane.View == null || host == null) return;
            if (pane.View.Parent != null && pane.View.Parent != host)
                pane.View.Parent.Controls.Remove(pane.View);
            pane.View.Dock = DockStyle.Fill;
            pane.View.DefaultBackgroundColor = Color.FromArgb(0x23, 0x22, 0x28);
            if (pane.View.Parent != host)
                host.Controls.Add(pane.View);
        }

        private void DisposePane(string profileId)
        {
            AccountPane pane;
            if (!_panesByProfile.TryGetValue(profileId, out pane)) return;
            if (pane.View != null && pane.View.Parent != null)
                pane.View.Parent.Controls.Remove(pane.View);
            pane.Dispose();
            _panesByProfile.Remove(profileId);
        }

        private async Task<AccountPane> EnsurePaneAsync(
            string profileId,
            Panel host,
            Label status
        )
        {
            var pane = GetPaneForProfile(profileId);
            var created = false;
            if (pane == null)
            {
                pane = new AccountPane(ProfileRegistry.Get(profileId));
                _panesByProfile[profileId] = pane;
                created = true;
            }

            AttachPane(pane, host);
            if (pane.IsInitialized)
            {
                ApplyPaneHealthToCurrentLabel(pane);
                return pane;
            }

            if (status != null)
            {
                status.Text = "Initializing";
                status.ForeColor = ForeColor;
            }
            pane.HealthState = PaneHealthState.Initializing;
            pane.HealthText = "Initializing";

            try
            {
                await pane.InitializeAsync(_dataRoot);
                ConfigureView(pane);

                if (!_smokeMode)
                {
                    if (_betterUiScript == null) _betterUiScript = LoadBetterUiScript();
                    await RegisterBetterUiAsync(pane.View, _betterUiScript);
                    NavigateHome(pane.View);
                }

                return pane;
            }
            catch
            {
                if (created)
                {
                    AccountPane current;
                    if (_panesByProfile.TryGetValue(profileId, out current)
                        && object.ReferenceEquals(current, pane))
                    {
                        DisposePane(profileId);
                    }
                    else
                    {
                        pane.Dispose();
                    }
                }
                throw;
            }
        }

        private async Task InitializeAsync()
        {
            try
            {
                _split.Panel1MinSize = 320;
                _split.Panel2MinSize = 320;
                _leftStatus.Text = "Initializing";
                _rightStatus.Text = "Initializing";

                if (_workspaceState.Mode == WorkspaceMode.Single)
                {
                    _split.Panel2Collapsed = true;
                    await EnsurePaneAsync(
                        _workspaceState.SingleProfileId,
                        _leftHost,
                        _leftStatus
                    );
                    _rightStatus.Text = "Idle";
                }
                else
                {
                    _split.Panel2Collapsed = false;
                    await EnsurePaneAsync(
                        _workspaceState.LeftProfileId,
                        _leftHost,
                        _leftStatus
                    );
                    await EnsurePaneAsync(
                        _workspaceState.RightProfileId,
                        _rightHost,
                        _rightStatus
                    );
                }

                if (_workspaceState.Mode == WorkspaceMode.Dual && _workspaceState.FocusMode)
                {
                    ApplyFocusLayout();
                }
                else
                {
                    SetSplitRatio(
                        _workspaceState.Mode == WorkspaceMode.Dual
                            ? _workspaceState.LayoutRatio
                            : _workspaceState.LastDualRatio
                    );
                }

                if (_smokeMode)
                {
                    _smokeTimer.Start();
                    await RunSmokeAsync();
                    return;
                }

                _commandDeck.Enabled = true;
                if (_workspaceState.MaintenanceDrawerExpanded)
                    BeginInvoke(new Action(ToggleMaintenanceDrawer));
            }
            catch (Exception ex)
            {
                _leftStatus.Text = "Init error";
                _rightStatus.Text = "Init error";
                Console.Error.WriteLine(ex);
                if (_smokeMode)
                {
                    Environment.ExitCode = 1;
                    Close();
                }
                else
                {
                    MessageBox.Show(
                        this,
                        ex.ToString(),
                        "Coupled Workspace initialization failed",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                }
            }
        }

        private async Task RunWorkspaceMutationAsync(Func<Task> action)
        {
            if (action == null) return;
            await _workspaceMutationGate.WaitAsync();
            try
            {
                await action();
            }
            catch (Exception ex)
            {
                if (_smokeMode) throw;

                var active = GetPaneForProfile(_workspaceState.ActiveProfileId);
                if (active != null && IsCurrentPane(active))
                {
                    active.LastErrorText =
                        "Workspace operation failed: " + ex.GetType().Name;
                    SetPaneHealth(active, PaneHealthState.Error, "OPERATION ERROR");
                }

                Console.Error.WriteLine("[CoupledWorkspace] operation failed: " + ex);
                RefreshMaintenanceDrawer();
            }
            finally
            {
                _workspaceMutationGate.Release();
            }
        }

        private async Task SwitchToSingleAsync(string profileId)
        {
            ProfileDefinition selectedProfile;
            if (!ProfileRegistry.TryGet(profileId, out selectedProfile))
                throw new InvalidOperationException("Unknown single-account profile: " + profileId);

            if (_workspaceState.Mode == WorkspaceMode.Dual && !_split.Panel2Collapsed)
            {
                var currentRatio = GetCurrentSplitRatio();
                _workspaceState.LayoutRatio = currentRatio;
                _workspaceState.LastDualRatio = currentRatio;
            }

            foreach (var existingProfileId in new List<string>(_panesByProfile.Keys))
            {
                if (!string.Equals(existingProfileId, selectedProfile.Id, StringComparison.OrdinalIgnoreCase))
                    DisposePane(existingProfileId);
            }

            _workspaceState.Mode = WorkspaceMode.Single;
            _workspaceState.SingleProfileId = selectedProfile.Id;
            _workspaceState.ActiveProfileId = selectedProfile.Id;
            _workspaceState.FocusMode = false;

            _split.Panel2Collapsed = true;
            _rightHost.Controls.Clear();
            _rightStatus.Text = "Idle";
            _rightStatus.ForeColor = ForeColor;

            await EnsurePaneAsync(selectedProfile.Id, _leftHost, _leftStatus);
            if (!_smokeMode) PersistWorkspaceState();
            UpdateCommandDeck();
        }

        private async Task SwitchSingleProfileAsync(string profileId)
        {
            if (_workspaceState.Mode != WorkspaceMode.Single)
                throw new InvalidOperationException("Single-profile switching requires Single mode.");

            if (string.Equals(_workspaceState.SingleProfileId, profileId, StringComparison.OrdinalIgnoreCase))
                return;

            await SwitchToSingleAsync(profileId);
        }

        private async Task SwitchToDualAsync()
        {
            if (_workspaceState.Mode == WorkspaceMode.Dual)
                return;

            _workspaceState.Mode = WorkspaceMode.Dual;
            _workspaceState.FocusMode = false;
            if (!string.Equals(_workspaceState.SingleProfileId, _workspaceState.LeftProfileId, StringComparison.OrdinalIgnoreCase)
                && !string.Equals(_workspaceState.SingleProfileId, _workspaceState.RightProfileId, StringComparison.OrdinalIgnoreCase))
            {
                _workspaceState.ActiveProfileId = _workspaceState.LeftProfileId;
            }
            else
            {
                _workspaceState.ActiveProfileId = _workspaceState.SingleProfileId;
            }

            _split.Panel2Collapsed = false;
            await EnsurePaneAsync(_workspaceState.LeftProfileId, _leftHost, _leftStatus);
            await EnsurePaneAsync(_workspaceState.RightProfileId, _rightHost, _rightStatus);
            SetSplitRatio(_workspaceState.LastDualRatio);

            if (!_smokeMode) PersistWorkspaceState();
            UpdateCommandDeck();
        }

        private void ApplyLayoutPreset(double ratio)
        {
            if (_workspaceState.Mode != WorkspaceMode.Dual || _workspaceState.FocusMode)
                return;
            SetSplitRatio(ratio);
            UpdateCommandDeck();
        }

        private bool IsCurrentLayoutPreset(double presetRatio)
        {
            if (_split == null
                || _workspaceState.Mode != WorkspaceMode.Dual
                || _workspaceState.FocusMode
                || _split.Panel1Collapsed
                || _split.Panel2Collapsed
                || _split.ClientSize.Width <= 0)
            {
                return false;
            }

            var available = Math.Max(1, _split.ClientSize.Width - _split.SplitterWidth);
            var target = ClampSplitterDistance(
                available,
                (int)Math.Round(available * presetRatio)
            );
            return Math.Abs(_split.SplitterDistance - target) <= 1;
        }

        private void HandleReleasedSplitter()
        {
            if (_workspaceState.Mode != WorkspaceMode.Dual
                || _workspaceState.FocusMode
                || _split.Panel1Collapsed
                || _split.Panel2Collapsed
                || _split.ClientSize.Width <= 0)
            {
                return;
            }

            var available = Math.Max(1, _split.ClientSize.Width - _split.SplitterWidth);
            var released = _split.SplitterDistance;
            var boundedReleased = ClampSplitterDistance(available, released);
            if (boundedReleased != released)
            {
                _applyingLayout = true;
                try
                {
                    _split.SplitterDistance = boundedReleased;
                }
                finally
                {
                    _applyingLayout = false;
                }
                released = boundedReleased;
            }
            var presetRatios = new[] { 1.0 / 3.0, 0.5, 2.0 / 3.0 };
            var snapped = false;

            foreach (var presetRatio in presetRatios)
            {
                var target = ClampSplitterDistance(
                    available,
                    (int)Math.Round(available * presetRatio)
                );
                if (Math.Abs(released - target) <= 24)
                {
                    SetSplitRatio(presetRatio);
                    snapped = true;
                    break;
                }
            }

            if (!snapped)
            {
                var effectiveRatio = GetCurrentSplitRatio();
                _workspaceState.LayoutRatio = effectiveRatio;
                _workspaceState.LastDualRatio = effectiveRatio;
                if (!_smokeMode) PersistWorkspaceState();
            }

            UpdateCommandDeck();
        }

        private void BoundSplitterMovement(SplitterCancelEventArgs args)
        {
            if (args == null
                || _applyingLayout
                || _workspaceState.Mode != WorkspaceMode.Dual
                || _workspaceState.FocusMode
                || _split.Panel1Collapsed
                || _split.Panel2Collapsed
                || _split.ClientSize.Width <= 0)
            {
                return;
            }

            var available = Math.Max(1, _split.ClientSize.Width - _split.SplitterWidth);
            args.SplitX = ClampSplitterDistance(available, args.SplitX);
        }

        private int ClampSplitterDistance(int available, int requested)
        {
            var minDistance = Math.Max(
                _split.Panel1MinSize,
                (int)Math.Ceiling(available * 0.20)
            );
            var maxDistance = Math.Min(
                available - _split.Panel2MinSize,
                (int)Math.Floor(available * 0.80)
            );
            if (maxDistance < minDistance) maxDistance = minDistance;
            return Math.Max(minDistance, Math.Min(maxDistance, requested));
        }

        private void SwapPanes()
        {
            if (_workspaceState.Mode != WorkspaceMode.Dual) return;

            var previousLeftProfileId = _workspaceState.LeftProfileId;
            _workspaceState.LeftProfileId = _workspaceState.RightProfileId;
            _workspaceState.RightProfileId = previousLeftProfileId;

            var leftPane = GetPaneForProfile(_workspaceState.LeftProfileId);
            var rightPane = GetPaneForProfile(_workspaceState.RightProfileId);
            AttachPane(leftPane, _leftHost);
            AttachPane(rightPane, _rightHost);
            ApplyPaneHealthToCurrentLabel(leftPane);
            ApplyPaneHealthToCurrentLabel(rightPane);

            if (_workspaceState.FocusMode)
                ApplyFocusLayout();

            if (!_smokeMode) PersistWorkspaceState();
            UpdateCommandDeck();
        }

        private void EnterFocusMode()
        {
            if (_workspaceState.Mode != WorkspaceMode.Dual || _workspaceState.FocusMode)
                return;

            _workspaceState.LayoutRatio = GetCurrentSplitRatio();
            _workspaceState.LastDualRatio = _workspaceState.LayoutRatio;
            _workspaceState.FocusMode = true;
            ApplyFocusLayout();
            if (!_smokeMode) PersistWorkspaceState();
            UpdateCommandDeck();
        }

        private void ApplyFocusLayout()
        {
            if (_workspaceState.Mode != WorkspaceMode.Dual || !_workspaceState.FocusMode)
                return;

            var activeOnLeft = string.Equals(
                _workspaceState.ActiveProfileId,
                _workspaceState.LeftProfileId,
                StringComparison.OrdinalIgnoreCase
            );

            _applyingLayout = true;
            try
            {
                _split.Panel1Collapsed = !activeOnLeft;
                _split.Panel2Collapsed = activeOnLeft;
            }
            finally
            {
                _applyingLayout = false;
            }
        }

        private void RestoreFocusMode()
        {
            if (_workspaceState.Mode != WorkspaceMode.Dual || !_workspaceState.FocusMode)
                return;

            _workspaceState.FocusMode = false;
            _applyingLayout = true;
            try
            {
                _split.Panel1Collapsed = false;
                _split.Panel2Collapsed = false;
            }
            finally
            {
                _applyingLayout = false;
            }

            SetSplitRatio(_workspaceState.LastDualRatio);
            if (!_smokeMode) PersistWorkspaceState();
            UpdateCommandDeck();
        }

        private double GetCurrentSplitRatio()
        {
            if (_split.ClientSize.Width <= 0 || _split.Panel1Collapsed || _split.Panel2Collapsed)
                return _workspaceState.LayoutRatio;

            var available = Math.Max(1, _split.ClientSize.Width - _split.SplitterWidth);
            return Math.Max(0.20, Math.Min(0.80, (double)_split.SplitterDistance / available));
        }

        private void PersistWorkspaceState()
        {
            if (_smokeMode) return;

            if (_workspaceState.Mode == WorkspaceMode.Dual && !_split.Panel2Collapsed)
            {
                var ratio = GetCurrentSplitRatio();
                _workspaceState.LayoutRatio = ratio;
                if (!_workspaceState.FocusMode) _workspaceState.LastDualRatio = ratio;
            }

            _settingsStore.Save(_workspaceState);
        }

        private void ConfigureView(AccountPane pane)
        {
            var view = pane.View;
            var profileId = pane.Profile.Id;
            var profileName = pane.Profile.DisplayName;
            var core = view.CoreWebView2;
            view.GotFocus += async delegate
            {
                await RunWorkspaceMutationAsync(delegate
                {
                    if (IsCurrentPane(pane)) SetActiveProfile(profileId);
                    return Task.FromResult(0);
                });
            };
            core.Settings.AreDevToolsEnabled = true;
            core.Settings.AreDefaultContextMenusEnabled = true;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = true;

            core.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs args)
            {
                if (!IsCurrentPane(pane)) return;
                pane.ActiveNavigationId = args.NavigationId;
                pane.CurrentUrl = args.Uri;
                if (!_smokeMode && !IsAllowedGameUrl(args.Uri))
                {
                    args.Cancel = true;
                    pane.LastErrorText = "Blocked URL: " + SafeDiagnosticUrl(args.Uri);
                    SetPaneHealth(pane, PaneHealthState.Blocked, "BLOCKED URL");
                    Console.Error.WriteLine(
                        "[CoupledWorkspace] " + profileName + " blocked: " + SafeDiagnosticUrl(args.Uri)
                    );
                    return;
                }

                SetPaneHealth(pane, PaneHealthState.Loading, "Loading");
            };

            core.NavigationCompleted += async delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
            {
                if (!IsCurrentPane(pane) || args.NavigationId != pane.ActiveNavigationId) return;
                pane.CurrentUrl = core.Source;
                if (args.IsSuccess)
                {
                    pane.LastErrorText = null;
                    SetPaneHealth(pane, PaneHealthState.Ready, "READY");
                    Console.WriteLine(
                        "[CoupledWorkspace] " + profileName + " loaded: " + SafeDiagnosticUrl(core.Source)
                    );
                    if (!_smokeMode)
                        await RefreshBetterUiHealthAsync(pane, args.NavigationId);
                }
                else
                {
                    pane.LastErrorText = args.WebErrorStatus + " " + SafeDiagnosticUrl(core.Source);
                    SetPaneHealth(pane, PaneHealthState.Error, "ERR " + args.WebErrorStatus);
                    Console.Error.WriteLine(
                        "[CoupledWorkspace] " + profileName + " load failed: "
                        + args.WebErrorStatus + " " + SafeDiagnosticUrl(core.Source)
                    );
                }
            };

            core.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs args)
            {
                args.Handled = true;
            };

            core.LaunchingExternalUriScheme += delegate(
                object sender,
                CoreWebView2LaunchingExternalUriSchemeEventArgs args
            )
            {
                args.Cancel = true;
                Console.Error.WriteLine(
                    "[CoupledWorkspace] " + profileName + " blocked external URI scheme: "
                    + SafeDiagnosticUrl(args.Uri)
                );
            };

            core.PermissionRequested += delegate(object sender, CoreWebView2PermissionRequestedEventArgs args)
            {
                args.State = CoreWebView2PermissionState.Deny;
            };

            core.ProcessFailed += delegate(object sender, CoreWebView2ProcessFailedEventArgs args)
            {
                if (!IsCurrentPane(pane)) return;
                pane.LastErrorText = "Process failed: " + args.ProcessFailedKind;
                SetPaneHealth(pane, PaneHealthState.ProcessFailed, "PROCESS FAILED");
                Console.Error.WriteLine(
                    "[CoupledWorkspace] " + profileName + " process failed: " + args.ProcessFailedKind
                );
            };
        }

        private async Task RefreshBetterUiHealthAsync(AccountPane pane, ulong navigationId)
        {
            if (!IsCurrentPane(pane)
                || !pane.IsInitialized
                || pane.View.CoreWebView2 == null)
                return;
            try
            {
                var ready = await pane.View.CoreWebView2.ExecuteScriptAsync(
                    "Boolean(window.__PPBUI_WEBVIEW2_READY__)"
                );
                if (IsCurrentPane(pane)
                    && navigationId == pane.ActiveNavigationId
                    && string.Equals(ready, "true", StringComparison.Ordinal))
                    SetPaneHealth(pane, PaneHealthState.UiReady, "UI READY");
            }
            catch (Exception ex)
            {
                if (IsCurrentPane(pane) && navigationId == pane.ActiveNavigationId)
                    pane.LastErrorText = "Better UI health probe failed: " + ex.GetType().Name;
            }
        }

        private async Task RegisterBetterUiAsync(WebView2 view, string script)
        {
            var guarded = BuildDocumentIdleScript(
                script,
                TargetOrigin,
                "__PPBUI_WEBVIEW2_INJECTED__",
                "__PPBUI_WEBVIEW2_READY__"
            );
            await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(guarded);
        }

        private static string BuildDocumentIdleScript(
            string script,
            string expectedOrigin,
            string markerName,
            string readyMarkerName
        )
        {
            var originGuard = expectedOrigin == null
                ? ""
                : "if(location.origin!==" + QuoteJs(expectedOrigin) + ")return;";
            return
                "(function(){"
                + "if(window.top!==window)return;"
                + originGuard
                + "function __ppbuiRun(){"
                + "if(window[" + QuoteJs(markerName) + "])return;"
                + "if(!document.body){setTimeout(__ppbuiRun,0);return;}"
                + "Object.defineProperty(window," + QuoteJs(markerName)
                + ",{value:true,configurable:false});\n"
                + script
                + (readyMarkerName == null
                    ? ""
                    : "\nObject.defineProperty(window," + QuoteJs(readyMarkerName)
                        + ",{value:true,configurable:false});")
                + "\n}"
                + "if(document.readyState==='loading'){"
                + "document.addEventListener('DOMContentLoaded',__ppbuiRun,{once:true});"
                + "}else{__ppbuiRun();}"
                + "})();";
        }

        private string LoadBetterUiScript()
        {
            var bundle = Path.GetFullPath(
                Path.Combine(_baseDir, "..", "..", "..", "dist", "pokepixel-better-ui.user.js")
            );
            if (!File.Exists(bundle))
            {
                throw new FileNotFoundException("Better UI bundle not found.", bundle);
            }
            return File.ReadAllText(bundle);
        }

        private static string QuoteJs(string value)
        {
            return "\""
                + value.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n")
                + "\"";
        }

        private static bool IsAllowedGameUrl(string raw)
        {
            Uri uri;
            if (!Uri.TryCreate(raw, UriKind.Absolute, out uri)) return false;
            if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return false;
            return string.Equals(
                uri.GetLeftPart(UriPartial.Authority).TrimEnd('/'),
                TargetOrigin,
                StringComparison.OrdinalIgnoreCase
            );
        }

        private static void NavigateHome(WebView2 view)
        {
            if (view.CoreWebView2 != null) view.CoreWebView2.Navigate(TargetUrl);
        }

        private async Task RunSmokeAsync()
        {
            RunWorkspaceSettingsSmoke();
            var leftPane = GetPaneForSide(PaneSide.Left);
            var rightPane = GetPaneForSide(PaneSide.Right);
            if (leftPane == null || rightPane == null)
                throw new InvalidOperationException("Dual smoke requires both account panes.");

            var betterUi = LoadBetterUiScript();
            if (betterUi.Length < 1024)
                throw new InvalidOperationException("Better UI bundle looks unexpectedly small.");

            await leftPane.View.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
                BuildDocumentIdleScript(
                    "window.__PPBUI_WEBVIEW2_SMOKE_VALUE__='left:'+Boolean(document.body);",
                    null,
                    "__PPBUI_WEBVIEW2_SMOKE_RUN__",
                    "__PPBUI_WEBVIEW2_SMOKE_READY__"
                )
            );
            await rightPane.View.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
                BuildDocumentIdleScript(
                    "window.__PPBUI_WEBVIEW2_SMOKE_VALUE__='right:'+Boolean(document.body);",
                    null,
                    "__PPBUI_WEBVIEW2_SMOKE_RUN__",
                    "__PPBUI_WEBVIEW2_SMOKE_READY__"
                )
            );

            var smokeDir = Path.Combine(_baseDir, "smoke");
            Directory.CreateDirectory(smokeDir);
            var leftFile = Path.Combine(smokeDir, "left.html");
            var rightFile = Path.Combine(smokeDir, "right.html");
            File.WriteAllText(leftFile, "<!doctype html><title>Left Smoke</title><body>left</body>");
            File.WriteAllText(rightFile, "<!doctype html><title>Right Smoke</title><body>right</body>");

            var leftDone = new TaskCompletionSource<bool>();
            var rightDone = new TaskCompletionSource<bool>();

            EventHandler<CoreWebView2NavigationCompletedEventArgs> leftHandler = null;
            EventHandler<CoreWebView2NavigationCompletedEventArgs> rightHandler = null;

            leftHandler = delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
            {
                leftPane.View.CoreWebView2.NavigationCompleted -= leftHandler;
                if (args.IsSuccess) leftDone.TrySetResult(true);
                else leftDone.TrySetException(new InvalidOperationException("Left smoke navigation failed: " + args.WebErrorStatus));
            };
            rightHandler = delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
            {
                rightPane.View.CoreWebView2.NavigationCompleted -= rightHandler;
                if (args.IsSuccess) rightDone.TrySetResult(true);
                else rightDone.TrySetException(new InvalidOperationException("Right smoke navigation failed: " + args.WebErrorStatus));
            };

            leftPane.View.CoreWebView2.NavigationCompleted += leftHandler;
            rightPane.View.CoreWebView2.NavigationCompleted += rightHandler;

            leftPane.View.CoreWebView2.Navigate(new Uri(leftFile).AbsoluteUri);
            rightPane.View.CoreWebView2.Navigate(new Uri(rightFile).AbsoluteUri);

            await Task.WhenAll(leftDone.Task, rightDone.Task);

            var leftTitle = await leftPane.View.CoreWebView2.ExecuteScriptAsync("document.title");
            var rightTitle = await rightPane.View.CoreWebView2.ExecuteScriptAsync("document.title");
            var leftMarker = await leftPane.View.CoreWebView2.ExecuteScriptAsync("window.__PPBUI_WEBVIEW2_SMOKE_VALUE__");
            var rightMarker = await rightPane.View.CoreWebView2.ExecuteScriptAsync("window.__PPBUI_WEBVIEW2_SMOKE_VALUE__");
            var leftReady = await leftPane.View.CoreWebView2.ExecuteScriptAsync("window.__PPBUI_WEBVIEW2_SMOKE_READY__");
            var rightReady = await rightPane.View.CoreWebView2.ExecuteScriptAsync("window.__PPBUI_WEBVIEW2_SMOKE_READY__");
            if (leftTitle.IndexOf("Left Smoke", StringComparison.Ordinal) < 0)
                throw new InvalidOperationException("Unexpected left smoke title: " + leftTitle);
            if (rightTitle.IndexOf("Right Smoke", StringComparison.Ordinal) < 0)
                throw new InvalidOperationException("Unexpected right smoke title: " + rightTitle);
            if (leftMarker.IndexOf("left:true", StringComparison.Ordinal) < 0)
                throw new InvalidOperationException("Left document-created script did not run: " + leftMarker);
            if (rightMarker.IndexOf("right:true", StringComparison.Ordinal) < 0)
                throw new InvalidOperationException("Right document-created script did not run: " + rightMarker);
            if (!string.Equals(leftReady, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("Left post-success ready marker missing: " + leftReady);
            if (!string.Equals(rightReady, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("Right post-success ready marker missing: " + rightReady);

            if (string.Equals(
                leftPane.View.CoreWebView2.Environment.UserDataFolder,
                rightPane.View.CoreWebView2.Environment.UserDataFolder,
                StringComparison.OrdinalIgnoreCase
            ))
            {
                throw new InvalidOperationException("WebView2 user data folders are not isolated.");
            }

            await RunWorkspaceLifecycleSmokeAsync(leftPane, rightPane);
            RunLayoutEngineSmoke();
            await CaptureVisualSmokeAsync();
            await RunHostCommandAndDiagnosticsSmokeAsync();

            _smokeTimer.Stop();
            Console.WriteLine("WebView2 coupled workspace smoke: PASS");
            Environment.ExitCode = 0;
            Close();
        }

        private async Task RunWorkspaceLifecycleSmokeAsync(
            AccountPane originalLeftPane,
            AccountPane originalRightPane
        )
        {
            var leftUdf = originalLeftPane.Environment.UserDataFolder;
            var rightUdf = originalRightPane.Environment.UserDataFolder;

            _workspaceState.ActiveProfileId = ProfileRegistry.Rhyosa.Id;
            await SwitchToSingleAsync(_workspaceState.ActiveProfileId);

            var singlePane = GetPaneForProfile(ProfileRegistry.Rhyosa.Id);
            if (_workspaceState.Mode != WorkspaceMode.Single
                || !_split.Panel2Collapsed
                || _panesByProfile.Count != 1
                || !object.ReferenceEquals(singlePane, originalRightPane)
                || GetPaneForProfile(ProfileRegistry.Rhyxus.Id) != null)
            {
                throw new InvalidOperationException("Dual-to-Single lifecycle contract failed.");
            }

            await SwitchToDualAsync();

            var restoredLeft = GetPaneForSide(PaneSide.Left);
            var restoredRight = GetPaneForSide(PaneSide.Right);
            if (_workspaceState.Mode != WorkspaceMode.Dual
                || _split.Panel2Collapsed
                || _panesByProfile.Count != 2
                || restoredLeft == null
                || restoredRight == null
                || object.ReferenceEquals(restoredLeft, originalLeftPane)
                || !object.ReferenceEquals(restoredRight, originalRightPane)
                || !string.Equals(
                    restoredLeft.Environment.UserDataFolder,
                    leftUdf,
                    StringComparison.OrdinalIgnoreCase
                )
                || !string.Equals(
                    restoredRight.Environment.UserDataFolder,
                    rightUdf,
                    StringComparison.OrdinalIgnoreCase
                ))
            {
                throw new InvalidOperationException("Single-to-Dual lazy restore contract failed.");
            }

            await SwitchToSingleAsync(ProfileRegistry.Rhyxus.Id);
            var rhyXusSingle = GetPaneForProfile(ProfileRegistry.Rhyxus.Id);
            if (rhyXusSingle == null
                || _panesByProfile.Count != 1
                || !string.Equals(
                    rhyXusSingle.Environment.UserDataFolder,
                    leftUdf,
                    StringComparison.OrdinalIgnoreCase
                ))
            {
                throw new InvalidOperationException("Single-mode profile selection baseline failed.");
            }

            await SwitchSingleProfileAsync(ProfileRegistry.Rhyosa.Id);
            var rhyOsaSingle = GetPaneForProfile(ProfileRegistry.Rhyosa.Id);
            if (rhyOsaSingle == null
                || _panesByProfile.Count != 1
                || GetPaneForProfile(ProfileRegistry.Rhyxus.Id) != null
                || !string.Equals(
                    rhyOsaSingle.Environment.UserDataFolder,
                    rightUdf,
                    StringComparison.OrdinalIgnoreCase
                ))
            {
                throw new InvalidOperationException("Single profile switch lifecycle contract failed.");
            }

            await SwitchToDualAsync();
            if (_panesByProfile.Count != 2
                || GetPaneForSide(PaneSide.Left) == null
                || GetPaneForSide(PaneSide.Right) == null
                || !string.Equals(
                    _workspaceState.ActiveProfileId,
                    ProfileRegistry.Rhyosa.Id,
                    StringComparison.OrdinalIgnoreCase
                ))
            {
                throw new InvalidOperationException("Final Dual restore after profile switch failed.");
            }
        }

        private void RunLayoutEngineSmoke()
        {
            if (_workspaceState.Mode != WorkspaceMode.Dual)
                throw new InvalidOperationException("Layout smoke requires Dual mode.");

            var leftBefore = GetPaneForSide(PaneSide.Left);
            var rightBefore = GetPaneForSide(PaneSide.Right);
            if (leftBefore == null || rightBefore == null)
                throw new InvalidOperationException("Layout smoke requires both account panes.");

            ApplyLayoutPreset(1.0 / 3.0);
            var presetRatio = GetCurrentSplitRatio();
            if (Math.Abs(presetRatio - (1.0 / 3.0)) > 0.02)
                throw new InvalidOperationException("1:2 layout preset failed.");

            var available = Math.Max(1, _split.ClientSize.Width - _split.SplitterWidth);
            var halfTarget = ClampSplitterDistance(
                available,
                (int)Math.Round(available * 0.5)
            );
            _applyingLayout = true;
            try
            {
                _split.SplitterDistance = ClampSplitterDistance(available, halfTarget + 20);
            }
            finally
            {
                _applyingLayout = false;
            }
            HandleReleasedSplitter();
            if (Math.Abs(GetCurrentSplitRatio() - 0.5) > 0.01)
                throw new InvalidOperationException("24px release snap failed.");

            var customTarget = ClampSplitterDistance(
                available,
                (int)Math.Round(available * 0.44)
            );
            _applyingLayout = true;
            try
            {
                _split.SplitterDistance = customTarget;
            }
            finally
            {
                _applyingLayout = false;
            }
            HandleReleasedSplitter();
            if (Math.Abs(GetCurrentSplitRatio() - ((double)customTarget / available)) > 0.005)
                throw new InvalidOperationException("Custom splitter ratio was incorrectly snapped.");

            var originalWidth = Width;
            Width = 2000;
            PerformLayout();
            var wideAvailable = Math.Max(1, _split.ClientSize.Width - _split.SplitterWidth);
            var wideMin = ClampSplitterDistance(wideAvailable, 0);
            if (wideMin <= _split.Panel1MinSize)
                throw new InvalidOperationException("Wide layout smoke did not make the 20% bound stricter than 320px.");
            var movingArgs = new SplitterCancelEventArgs(0, 0, _split.Panel1MinSize, 0);
            BoundSplitterMovement(movingArgs);
            if (movingArgs.SplitX != wideMin)
                throw new InvalidOperationException("SplitterMoving did not enforce the effective 20% wide-layout bound.");
            _applyingLayout = true;
            try
            {
                _split.SplitterDistance = _split.Panel1MinSize;
            }
            finally
            {
                _applyingLayout = false;
            }
            HandleReleasedSplitter();
            if (_split.SplitterDistance != wideMin
                || Math.Abs(GetCurrentSplitRatio() - ((double)wideMin / wideAvailable)) > 0.005)
            {
                throw new InvalidOperationException("Effective 20% wide-layout splitter bound failed.");
            }

            var wideHalf = ClampSplitterDistance(
                wideAvailable,
                (int)Math.Round(wideAvailable * 0.5)
            );
            _applyingLayout = true;
            try
            {
                _split.SplitterDistance = ClampSplitterDistance(wideAvailable, wideHalf + 30);
            }
            finally
            {
                _applyingLayout = false;
            }
            HandleReleasedSplitter();
            if (IsCurrentLayoutPreset(0.5))
                throw new InvalidOperationException("Custom wide layout was incorrectly marked as the 1:1 preset.");
            Width = originalWidth;
            PerformLayout();
            SetSplitRatio(0.44);

            var leftProfileBefore = _workspaceState.LeftProfileId;
            var rightProfileBefore = _workspaceState.RightProfileId;
            var activeProfileBefore = _workspaceState.ActiveProfileId;
            SwapPanes();

            if (!string.Equals(_workspaceState.LeftProfileId, rightProfileBefore, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(_workspaceState.RightProfileId, leftProfileBefore, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(_workspaceState.ActiveProfileId, activeProfileBefore, StringComparison.OrdinalIgnoreCase)
                || !object.ReferenceEquals(GetPaneForSide(PaneSide.Left), rightBefore)
                || !object.ReferenceEquals(GetPaneForSide(PaneSide.Right), leftBefore))
            {
                throw new InvalidOperationException("Swap profile/pane identity contract failed.");
            }

            var ratioBeforeFocus = GetCurrentSplitRatio();
            EnterFocusMode();
            var activeOnLeft = string.Equals(
                _workspaceState.ActiveProfileId,
                _workspaceState.LeftProfileId,
                StringComparison.OrdinalIgnoreCase
            );
            if (!_workspaceState.FocusMode
                || _panesByProfile.Count != 2
                || _split.Panel1Collapsed != !activeOnLeft
                || _split.Panel2Collapsed != activeOnLeft
                || !object.ReferenceEquals(GetPaneForProfile(leftBefore.Profile.Id), leftBefore)
                || !object.ReferenceEquals(GetPaneForProfile(rightBefore.Profile.Id), rightBefore))
            {
                throw new InvalidOperationException("Focus mode changed pane lifecycle or collapsed the wrong side.");
            }

            SwapPanes();
            var activeAfterFocusedSwapOnLeft = string.Equals(
                _workspaceState.ActiveProfileId,
                _workspaceState.LeftProfileId,
                StringComparison.OrdinalIgnoreCase
            );
            if (_split.Panel1Collapsed != !activeAfterFocusedSwapOnLeft
                || _split.Panel2Collapsed != activeAfterFocusedSwapOnLeft)
            {
                throw new InvalidOperationException("Focused Swap did not keep Active profile visible.");
            }

            RestoreFocusMode();
            if (_workspaceState.FocusMode
                || _split.Panel1Collapsed
                || _split.Panel2Collapsed
                || _panesByProfile.Count != 2
                || Math.Abs(GetCurrentSplitRatio() - ratioBeforeFocus) > 0.01)
            {
                throw new InvalidOperationException("Focus Restore contract failed.");
            }
        }

        private async Task CaptureVisualSmokeAsync()
        {
            var outputDir = Path.Combine(_baseDir, "smoke", "visual");
            Directory.CreateDirectory(outputDir);
            var originalWidth = Width;
            var originalHeight = Height;
            var originalDeckEnabled = _commandDeck.Enabled;
            _commandDeck.Enabled = true;

            _workspaceState.LeftProfileId = ProfileRegistry.Rhyxus.Id;
            _workspaceState.RightProfileId = ProfileRegistry.Rhyosa.Id;
            _workspaceState.ActiveProfileId = ProfileRegistry.Rhyxus.Id;
            if (_workspaceState.Mode != WorkspaceMode.Dual)
                await SwitchToDualAsync();
            if (_workspaceState.FocusMode) RestoreFocusMode();
            await PrepareVisualSmokePagesAsync();
            ApplyLayoutPreset(0.5);

            Width = 1600;
            PerformLayout();
            UpdateCommandDeck();
            LayoutCommandDeck();
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-dual-1600.png")
            );

            Width = 1180;
            Height = 600;
            PerformLayout();
            UpdateCommandDeck();
            LayoutCommandDeck();
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-dual-1180.png")
            );
            CaptureControl(
                _rootLayout,
                Path.Combine(outputDir, "workspace-dual-1180.png")
            );
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-dual-composite-1180.png"),
                false
            );

            _leftAccountButton.Focus();
            Application.DoEvents();
            UpdateCommandDeck();
            LayoutCommandDeck();
            Application.DoEvents();
            if (!_leftAccountButton.Focused
                || _leftAccountButton.FlatAppearance.BorderColor.ToArgb()
                    != Color.FromArgb(0x54, 0xBA, 0xD2).ToArgb())
            {
                throw new InvalidOperationException("Keyboard focus cue was not preserved on the selected account control.");
            }
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-keyboard-focus-1180.png")
            );
            CaptureControl(
                _rootLayout,
                Path.Combine(outputDir, "workspace-keyboard-focus-1180.png")
            );

            await SwitchToSingleAsync(ProfileRegistry.Rhyxus.Id);
            PerformLayout();
            UpdateCommandDeck();
            LayoutCommandDeck();
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-single-1180.png")
            );

            await SwitchToDualAsync();
            await PrepareVisualSmokePagesAsync();
            SetActiveProfile(ProfileRegistry.Rhyosa.Id);
            EnterFocusMode();
            PerformLayout();
            UpdateCommandDeck();
            LayoutCommandDeck();
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-focus-1180.png")
            );
            CaptureControl(
                _rootLayout,
                Path.Combine(outputDir, "workspace-focus-1180.png")
            );
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-focus-composite-1180.png"),
                false
            );
            RestoreFocusMode();

            if (_maintenanceDrawer != null && !_maintenanceDrawer.IsDisposed)
                _maintenanceDrawer.Dispose();
            _maintenanceDrawer = CreateMaintenanceDrawer();
            _maintenanceDrawer.StartPosition = FormStartPosition.Manual;
            _maintenanceDrawer.Location = new Point(-10000, -10000);
            _maintenanceDrawer.Show(this);
            Application.DoEvents();
            RefreshMaintenanceDrawer();
            EnsureControlTreeCreated(_maintenanceDrawer);
            _maintenanceDrawer.PerformLayout();
            _maintenanceDrawerSurface.PerformLayout();
            _maintenanceDrawerBody.PerformLayout();
            Application.DoEvents();
            CaptureControl(
                _maintenanceDrawerSurface,
                Path.Combine(outputDir, "maintenance-drawer.png")
            );
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-drawer-composite-1180.png"),
                true
            );
            RunMaintenanceDrawerKeyboardSmoke();
            _maintenanceDrawer.Dispose();
            _maintenanceDrawer = null;
            _maintenanceDrawerSurface = null;
            _maintenanceDrawerBody = null;

            Width = originalWidth;
            Height = originalHeight;
            _commandDeck.Enabled = originalDeckEnabled;
            PerformLayout();
            UpdateCommandDeck();
            LayoutCommandDeck();
        }

        private void RunMaintenanceDrawerKeyboardSmoke()
        {
            if (_maintenanceDrawer == null
                || _maintenanceDrawer.IsDisposed
                || _drawerResetLayoutButton == null
                || _drawerRecoverButton == null)
            {
                throw new InvalidOperationException("Maintenance drawer keyboard smoke requires a live drawer.");
            }

            _drawerResetLayoutButton.Focus();
            Application.DoEvents();
            if (!_drawerResetLayoutButton.Focused)
                throw new InvalidOperationException("Maintenance drawer reset control did not receive focus.");

            var tabMessage = Message.Create(
                _drawerResetLayoutButton.Handle,
                0x0100,
                new IntPtr((int)Keys.Tab),
                IntPtr.Zero
            );
            var tabHandled = _drawerResetLayoutButton.PreProcessMessage(ref tabMessage);
            Application.DoEvents();
            if (!tabHandled || _maintenanceDrawer.Visible)
                throw new InvalidOperationException("Maintenance drawer forward Tab boundary did not exit the drawer.");

            _maintenanceDrawer.Location = new Point(-10000, -10000);
            _maintenanceDrawer.Show(this);
            _drawerRecoverButton.Focus();
            Application.DoEvents();
            if (!_drawerRecoverButton.Focused)
                throw new InvalidOperationException("Maintenance drawer recover control did not receive focus.");

            var drawer = _maintenanceDrawer as MaintenanceDrawerForm;
            if (drawer == null
                || !drawer.ProcessDialogKeyForSmoke(Keys.Tab | Keys.Shift))
            {
                throw new InvalidOperationException("Maintenance drawer Shift+Tab boundary was not handled as a dialog key.");
            }
            Application.DoEvents();
            if (_maintenanceDrawer.Visible)
                throw new InvalidOperationException("Maintenance drawer Shift+Tab boundary did not exit the drawer.");
        }

        private async Task PrepareVisualSmokePagesAsync()
        {
            var visualDir = Path.Combine(_baseDir, "smoke", "visual-pages");
            Directory.CreateDirectory(visualDir);
            var leftPath = Path.Combine(visualDir, "rhyxus.html");
            var rightPath = Path.Combine(visualDir, "rhyosa.html");
            File.WriteAllText(leftPath, BuildVisualSmokeHtml("RHYXUS", "LOCAL WEBVIEW2"));
            File.WriteAllText(rightPath, BuildVisualSmokeHtml("RHYOSA", "LOCAL WEBVIEW2"));

            var left = GetPaneForProfile(ProfileRegistry.Rhyxus.Id);
            var right = GetPaneForProfile(ProfileRegistry.Rhyosa.Id);
            if (left == null || right == null)
                throw new InvalidOperationException("Visual smoke requires both profile panes.");

            await Task.WhenAll(
                NavigateSmokePaneAsync(left, new Uri(leftPath).AbsoluteUri),
                NavigateSmokePaneAsync(right, new Uri(rightPath).AbsoluteUri)
            );
        }

        private static string BuildVisualSmokeHtml(string profileName, string context)
        {
            return "<!doctype html><html><head><meta charset=\"utf-8\"><style>"
                + "html,body{margin:0;width:100%;height:100%;background:#17161b;color:#c3d5c7;}"
                + "body{display:grid;place-items:center;font:16px Consolas,monospace;}"
                + ".frame{border:2px solid #5f5854;padding:18px 24px;background:#232228;text-align:center;}"
                + ".name{color:#ebecdc;font-weight:700;letter-spacing:1px;}"
                + ".context{margin-top:8px;color:#878573;font-size:12px;}"
                + "</style><title>" + profileName + " Visual Smoke</title></head><body>"
                + "<div class=\"frame\"><div class=\"name\">" + profileName + "</div>"
                + "<div class=\"context\">" + context + "</div></div></body></html>";
        }

        private async Task NavigateSmokePaneAsync(AccountPane pane, string uri)
        {
            if (pane == null || pane.View == null || pane.View.CoreWebView2 == null)
                throw new InvalidOperationException("Visual smoke pane is not initialized.");

            var completed = new TaskCompletionSource<bool>();
            EventHandler<CoreWebView2NavigationCompletedEventArgs> handler = null;
            handler = delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
            {
                pane.View.CoreWebView2.NavigationCompleted -= handler;
                if (args.IsSuccess) completed.TrySetResult(true);
                else completed.TrySetException(
                    new InvalidOperationException("Visual smoke navigation failed: " + args.WebErrorStatus)
                );
            };
            pane.View.CoreWebView2.NavigationCompleted += handler;
            pane.View.CoreWebView2.Navigate(uri);
            await completed.Task;
        }

        private async Task CaptureWorkspaceCompositeAsync(string path, bool includeDrawer)
        {
            EnsureControlTreeCreated(_rootLayout);
            _rootLayout.PerformLayout();
            Application.DoEvents();

            using (var bitmap = new Bitmap(_rootLayout.Width, _rootLayout.Height))
            {
                _rootLayout.DrawToBitmap(
                    bitmap,
                    new Rectangle(0, 0, _rootLayout.Width, _rootLayout.Height)
                );

                using (var graphics = Graphics.FromImage(bitmap))
                {
                    if (_workspaceState.Mode == WorkspaceMode.Single)
                    {
                        await DrawPanePreviewAsync(
                            graphics,
                            GetPaneForProfile(_workspaceState.SingleProfileId)
                        );
                    }
                    else if (_workspaceState.FocusMode)
                    {
                        await DrawPanePreviewAsync(
                            graphics,
                            GetPaneForProfile(_workspaceState.ActiveProfileId)
                        );
                    }
                    else
                    {
                        await DrawPanePreviewAsync(graphics, GetPaneForSide(PaneSide.Left));
                        await DrawPanePreviewAsync(graphics, GetPaneForSide(PaneSide.Right));
                    }

                    if (includeDrawer
                        && _maintenanceDrawerSurface != null
                        && !_maintenanceDrawerSurface.IsDisposed)
                    {
                        using (var drawerBitmap = new Bitmap(
                            _maintenanceDrawerSurface.Width,
                            _maintenanceDrawerSurface.Height
                        ))
                        {
                            _maintenanceDrawerSurface.DrawToBitmap(
                                drawerBitmap,
                                new Rectangle(
                                    0,
                                    0,
                                    _maintenanceDrawerSurface.Width,
                                    _maintenanceDrawerSurface.Height
                                )
                            );
                            var rootOrigin = _rootLayout.PointToScreen(Point.Empty);
                            var trigger = _maintenanceButton.PointToScreen(
                                new Point(_maintenanceButton.Width, _maintenanceButton.Height)
                            );
                            var drawerX = trigger.X - rootOrigin.X - drawerBitmap.Width;
                            var drawerY = trigger.Y - rootOrigin.Y;
                            graphics.DrawImageUnscaled(drawerBitmap, drawerX, drawerY);
                        }
                    }
                }

                bitmap.Save(path, System.Drawing.Imaging.ImageFormat.Png);
            }
        }

        private async Task DrawPanePreviewAsync(Graphics graphics, AccountPane pane)
        {
            if (graphics == null
                || pane == null
                || pane.View == null
                || pane.View.CoreWebView2 == null
                || pane.View.Width <= 0
                || pane.View.Height <= 0)
            {
                return;
            }

            using (var stream = new MemoryStream())
            {
                await pane.View.CoreWebView2.CapturePreviewAsync(
                    CoreWebView2CapturePreviewImageFormat.Png,
                    stream
                );
                stream.Position = 0;
                using (var source = new Bitmap(stream))
                using (var preview = new Bitmap(source))
                {
                    var rootOrigin = _rootLayout.PointToScreen(Point.Empty);
                    var viewOrigin = pane.View.PointToScreen(Point.Empty);
                    var destination = new Rectangle(
                        viewOrigin.X - rootOrigin.X,
                        viewOrigin.Y - rootOrigin.Y,
                        pane.View.Width,
                        pane.View.Height
                    );
                    graphics.DrawImage(preview, destination);
                }
            }
        }

        private async Task RunHostCommandAndDiagnosticsSmokeAsync()
        {
            if (_workspaceState.Mode != WorkspaceMode.Dual)
                await SwitchToDualAsync();
            if (_workspaceState.FocusMode) RestoreFocusMode();

            _workspaceState.CommandScope = CommandScope.Active;
            var activeCount = 0;
            ExecuteScopedCommand(delegate(AccountPane pane) { activeCount++; });
            if (activeCount != 1)
                throw new InvalidOperationException("Active command scope did not target exactly one pane.");

            _workspaceState.CommandScope = CommandScope.Both;
            var bothCount = 0;
            ExecuteScopedCommand(delegate(AccountPane pane) { bothCount++; });
            if (bothCount != 2)
                throw new InvalidOperationException("Both command scope did not target both Dual panes.");

            await SwitchToSingleAsync(_workspaceState.ActiveProfileId);
            var singleBothCount = 0;
            ExecuteScopedCommand(delegate(AccountPane pane) { singleBothCount++; });
            if (singleBothCount != 1)
                throw new InvalidOperationException("Both scope in Single mode must target only the visible account.");

            await SwitchToDualAsync();
            _workspaceState.CommandScope = CommandScope.Active;

            var activeProfileId = _workspaceState.ActiveProfileId;
            var beforeRecovery = GetPaneForProfile(activeProfileId);
            if (beforeRecovery == null)
                throw new InvalidOperationException("Active pane missing before recovery smoke.");
            var activeUdf = beforeRecovery.Environment.UserDataFolder;
            beforeRecovery.CurrentUrl =
                "https://user:secret@pokepixel.nietore.com/play/?token=must-not-leak#private";
            beforeRecovery.LastErrorText = "Synthetic diagnostic smoke";

            var diagnostics = BuildDiagnosticsText();
            if (diagnostics.IndexOf("must-not-leak", StringComparison.OrdinalIgnoreCase) >= 0
                || diagnostics.IndexOf("#private", StringComparison.OrdinalIgnoreCase) >= 0
                || diagnostics.IndexOf("secret", StringComparison.OrdinalIgnoreCase) >= 0
                || diagnostics.IndexOf("user@", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                throw new InvalidOperationException("Diagnostics leaked URL credential/query/fragment data.");
            }

            await RecoverActivePaneAsync();
            var afterRecovery = GetPaneForProfile(activeProfileId);
            if (afterRecovery == null
                || object.ReferenceEquals(beforeRecovery, afterRecovery)
                || !string.Equals(
                    afterRecovery.Environment.UserDataFolder,
                    activeUdf,
                    StringComparison.OrdinalIgnoreCase
                )
                || _panesByProfile.Count != 2)
            {
                throw new InvalidOperationException("Active pane recovery violated profile/UDF isolation.");
            }
        }

        private static void CaptureControl(Control control, string path)
        {
            if (control == null || control.Width <= 0 || control.Height <= 0)
                throw new InvalidOperationException("Visual smoke control has invalid geometry.");

            EnsureControlTreeCreated(control);
            control.PerformLayout();
            Application.DoEvents();
            using (var bitmap = new Bitmap(control.Width, control.Height))
            {
                control.DrawToBitmap(bitmap, new Rectangle(0, 0, control.Width, control.Height));
                bitmap.Save(path, System.Drawing.Imaging.ImageFormat.Png);
            }
        }

        private static void EnsureControlTreeCreated(Control control)
        {
            control.CreateControl();
            foreach (Control child in control.Controls)
                EnsureControlTreeCreated(child);
        }

        private void RunWorkspaceSettingsSmoke()
        {
            var settingsDir = Path.Combine(_baseDir, "smoke", "settings");
            Directory.CreateDirectory(settingsDir);
            var settingsPath = Path.Combine(settingsDir, "workspace.json");
            var store = new WorkspaceSettingsStore(settingsPath);

            var state = WorkspaceState.CreateBaseline();
            state.Mode = WorkspaceMode.Single;
            state.SingleProfileId = ProfileRegistry.Rhyosa.Id;
            state.ActiveProfileId = ProfileRegistry.Rhyosa.Id;
            state.LayoutRatio = 0.33;
            state.LastDualRatio = 0.67;
            state.CommandScope = CommandScope.Both;
            state.ZoomByProfile[ProfileRegistry.Rhyxus.Id] = 1.25;
            state.ZoomByProfile[ProfileRegistry.Rhyosa.Id] = 0.80;
            state.MaintenanceDrawerExpanded = true;

            store.Save(state);
            var loaded = store.LoadOrDefault();
            if (loaded.Mode != WorkspaceMode.Single
                || !string.Equals(loaded.SingleProfileId, ProfileRegistry.Rhyosa.Id, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(loaded.ActiveProfileId, ProfileRegistry.Rhyosa.Id, StringComparison.OrdinalIgnoreCase)
                || loaded.CommandScope != CommandScope.Both
                || Math.Abs(loaded.LayoutRatio - 0.33) > 0.0001
                || Math.Abs(loaded.LastDualRatio - 0.67) > 0.0001
                || Math.Abs(loaded.ZoomByProfile[ProfileRegistry.Rhyxus.Id] - 1.25) > 0.0001
                || Math.Abs(loaded.ZoomByProfile[ProfileRegistry.Rhyosa.Id] - 0.80) > 0.0001
                || !loaded.MaintenanceDrawerExpanded)
            {
                throw new InvalidOperationException("Workspace settings round-trip failed.");
            }

            var malformed = WorkspaceState.CreateBaseline();
            malformed.LayoutRatio = double.NaN;
            malformed.LastDualRatio = 9.0;
            malformed.ZoomByProfile[ProfileRegistry.Rhyxus.Id] = 99.0;
            malformed.ActiveProfileId = "unknown-profile";
            var normalized = store.Normalize(malformed);
            if (Math.Abs(normalized.LayoutRatio - 0.5) > 0.0001
                || Math.Abs(normalized.LastDualRatio - 0.8) > 0.0001
                || Math.Abs(normalized.ZoomByProfile[ProfileRegistry.Rhyxus.Id] - 2.0) > 0.0001
                || !string.Equals(normalized.ActiveProfileId, normalized.LeftProfileId, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Workspace settings normalization failed.");
            }

            File.WriteAllText(settingsPath, "{ this is not valid json");
            var fallback = store.LoadOrDefault();
            if (fallback.Mode != WorkspaceMode.Dual
                || !string.Equals(fallback.LeftProfileId, ProfileRegistry.Rhyxus.Id, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(fallback.RightProfileId, ProfileRegistry.Rhyosa.Id, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Corrupt workspace settings did not fail safely.");
            }

            File.WriteAllText(settingsPath, "{\"version\":99}");
            var futureFallback = store.LoadOrDefault();
            if (futureFallback.Version != WorkspaceSettingsStore.CurrentVersion
                || futureFallback.Mode != WorkspaceMode.Dual)
            {
                throw new InvalidOperationException("Future workspace settings version did not fail safely.");
            }
        }

        private void SetSplitRatio(double ratio)
        {
            if (_split.ClientSize.Width <= 0 || _split.Panel1Collapsed || _split.Panel2Collapsed) return;
            ratio = Math.Max(0.2, Math.Min(0.8, ratio));
            var available = Math.Max(1, _split.ClientSize.Width - _split.SplitterWidth);
            var target = ClampSplitterDistance(
                available,
                (int)Math.Round(available * ratio)
            );

            _applyingLayout = true;
            try
            {
                _split.SplitterDistance = target;
            }
            finally
            {
                _applyingLayout = false;
            }

            var effectiveRatio = (double)target / available;
            _workspaceState.LayoutRatio = effectiveRatio;
            if (_workspaceState.Mode == WorkspaceMode.Dual && !_workspaceState.FocusMode)
                _workspaceState.LastDualRatio = effectiveRatio;
            if (!_smokeMode) PersistWorkspaceState();
        }
    }

    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            var smoke = args != null && Array.IndexOf(args, "--smoke") >= 0;
            var baseDir = AppDomain.CurrentDomain.BaseDirectory;
            Application.Run(new WorkspaceForm(baseDir, smoke));
        }
    }
}
