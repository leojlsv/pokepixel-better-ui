using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PokePixel.CoupledWorkspace
{
    internal static class WorkspaceChrome
    {
        internal static readonly Color Window = Color.FromArgb(0x16, 0x1D, 0x20);
        internal static readonly Color Interactive = Color.FromArgb(0x23, 0x2C, 0x2E);
        internal static readonly Color Hover = Color.FromArgb(0x32, 0x3F, 0x40);
        internal static readonly Color Line = Color.FromArgb(0x6B, 0x65, 0x43);
        internal static readonly Color Text = Color.FromArgb(0xEB, 0xEC, 0xDC);
        internal static readonly Color Subtle = Color.FromArgb(0xC3, 0xD5, 0xC7);
        internal static readonly Color Disabled = Color.FromArgb(0x8C, 0x9B, 0x93);
        internal static readonly Color Selected = Color.FromArgb(0xE3, 0xC0, 0x54);
        internal static readonly Color Focus = Color.FromArgb(0x54, 0xBA, 0xD2);
        internal static readonly Color Error = Color.FromArgb(0xE6, 0x92, 0x8A);
    }

    internal sealed class BetterUiFlowLayoutPanel : FlowLayoutPanel
    {
        private const int LogicalScrollbarWidth = 10;
        private const int LogicalMinimumThumbHeight = 24;
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
            var scrollbarWidth = ScaleMetric(LogicalScrollbarWidth);
            return new Rectangle(
                Math.Max(0, ClientSize.Width - scrollbarWidth),
                0,
                scrollbarWidth,
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
                ScaleMetric(LogicalMinimumThumbHeight),
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
            using (var trackBrush = new SolidBrush(WorkspaceChrome.Window))
                graphics.FillRectangle(trackBrush, track);

            if (!HasVerticalOverflow()) return;

            var thumb = GetThumbRectangle();
            var thumbColor = _hoveringThumb || _draggingThumb
                ? WorkspaceChrome.Subtle
                : WorkspaceChrome.Line;
            using (var thumbBrush = new SolidBrush(thumbColor))
                graphics.FillRectangle(thumbBrush, thumb);
        }

        private void InvalidateScrollbar()
        {
            Invalidate(GetTrackRectangle());
        }

        private int ScaleMetric(int logicalPixels)
        {
            return Math.Max(
                1,
                (int)Math.Round(
                    logicalPixels * Math.Max(96, DeviceDpi) / 96.0,
                    MidpointRounding.AwayFromZero
                )
            );
        }
    }

    internal sealed class BetterUiMenuRenderer : ToolStripRenderer
    {
        private static readonly Color Base = WorkspaceChrome.Interactive;
        private static readonly Color Stone = WorkspaceChrome.Line;
        private static readonly Color Strong = WorkspaceChrome.Focus;

        protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e)
        {
            using (var brush = new SolidBrush(Base))
                e.Graphics.FillRectangle(brush, e.AffectedBounds);
        }

        protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e)
        {
            var edge = ScaleMetric(e.ToolStrip, 1);
            using (var brush = new SolidBrush(Stone))
            {
                e.Graphics.FillRectangle(brush, 0, 0, e.ToolStrip.Width, edge);
                e.Graphics.FillRectangle(brush, 0, e.ToolStrip.Height - edge, e.ToolStrip.Width, edge);
                e.Graphics.FillRectangle(brush, 0, 0, edge, e.ToolStrip.Height);
                e.Graphics.FillRectangle(brush, e.ToolStrip.Width - edge, 0, edge, e.ToolStrip.Height);
            }
        }

        protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e)
        {
            var color = e.Item.Selected || e.Item.Pressed ? WorkspaceChrome.Hover : Base;
            using (var brush = new SolidBrush(color))
                e.Graphics.FillRectangle(brush, new Rectangle(Point.Empty, e.Item.Size));

            if (e.Item.Selected)
            {
                var edge = ScaleMetric(e.ToolStrip, 1);
                using (var pen = new Pen(Strong, edge))
                    e.Graphics.DrawRectangle(
                        pen,
                        edge / 2,
                        edge / 2,
                        Math.Max(0, e.Item.Width - edge - 1),
                        Math.Max(0, e.Item.Height - edge - 1)
                    );
            }
        }

        protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
        {
            e.TextColor = e.Item.ForeColor;
            base.OnRenderItemText(e);
        }

        protected override void OnRenderImageMargin(ToolStripRenderEventArgs e)
        {
        }

        private static int ScaleMetric(Control control, int logicalPixels)
        {
            var dpi = control == null ? 96 : Math.Max(96, control.DeviceDpi);
            return Math.Max(
                1,
                (int)Math.Round(
                    logicalPixels * dpi / 96.0,
                    MidpointRounding.AwayFromZero
                )
            );
        }
    }

    internal sealed class BetterUiButton : Button
    {
        private static readonly Color DisabledText = WorkspaceChrome.Disabled;

        public void NotifyAccessibleStateChanged()
        {
            AccessibilityNotifyClients(AccessibleEvents.StateChange, -1);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            if (Enabled)
            {
                base.OnPaint(e);
                return;
            }

            var border = Math.Max(1, FlatAppearance.BorderSize);
            using (var background = new SolidBrush(BackColor))
                e.Graphics.FillRectangle(background, ClientRectangle);
            using (var edge = new SolidBrush(FlatAppearance.BorderColor))
            {
                e.Graphics.FillRectangle(edge, 0, 0, Width, border);
                e.Graphics.FillRectangle(edge, 0, Math.Max(0, Height - border), Width, border);
                e.Graphics.FillRectangle(edge, 0, 0, border, Height);
                e.Graphics.FillRectangle(edge, Math.Max(0, Width - border), 0, border, Height);
            }
            var textBounds = new Rectangle(
                border,
                border,
                Math.Max(0, Width - border * 2),
                Math.Max(0, Height - border * 2)
            );
            TextRenderer.DrawText(
                e.Graphics,
                Text,
                Font,
                textBounds,
                DisabledText,
                TextFormatFlags.HorizontalCenter
                    | TextFormatFlags.VerticalCenter
                    | TextFormatFlags.SingleLine
                    | TextFormatFlags.EndEllipsis
                    | TextFormatFlags.NoPadding
            );
        }
    }

    internal sealed class BetterUiSelect : Control
    {
        private readonly List<object> _items = new List<object>();
        private readonly ContextMenuStrip _menu;
        private int _selectedIndex = -1;
        private bool _hover;
        private bool _pressed;

        public BetterUiSelect()
        {
            SetStyle(
                ControlStyles.AllPaintingInWmPaint
                | ControlStyles.OptimizedDoubleBuffer
                | ControlStyles.ResizeRedraw
                | ControlStyles.UserPaint,
                true
            );
            Height = 28;
            TabStop = true;
            AccessibleRole = AccessibleRole.ComboBox;
            Cursor = Cursors.Hand;
            BackColor = WorkspaceChrome.Interactive;
            ForeColor = WorkspaceChrome.Text;

            _menu = new ContextMenuStrip();
            _menu.ShowImageMargin = false;
            _menu.ShowCheckMargin = false;
            _menu.Padding = new Padding(2);
            _menu.BackColor = BackColor;
            _menu.ForeColor = ForeColor;
            _menu.Renderer = new BetterUiMenuRenderer();
            _menu.Opened += delegate
            {
                AccessibilityNotifyClients(AccessibleEvents.StateChange, -1);
            };
            _menu.Closed += delegate
            {
                AccessibilityNotifyClients(AccessibleEvents.StateChange, -1);
            };
        }

        public IList<object> Items
        {
            get { return _items; }
        }

        public int SelectedIndex
        {
            get { return _selectedIndex; }
            set
            {
                var normalized = value >= 0 && value < _items.Count ? value : -1;
                if (_selectedIndex == normalized) return;
                _selectedIndex = normalized;
                Invalidate();
                AccessibilityNotifyClients(AccessibleEvents.ValueChange, -1);
                var handler = SelectedIndexChanged;
                if (handler != null) handler(this, EventArgs.Empty);
            }
        }

        public object SelectedItem
        {
            get
            {
                return _selectedIndex >= 0 && _selectedIndex < _items.Count
                    ? _items[_selectedIndex]
                    : null;
            }
            set
            {
                var index = -1;
                for (var i = 0; i < _items.Count; i++)
                {
                    if (object.ReferenceEquals(_items[i], value) || object.Equals(_items[i], value))
                    {
                        index = i;
                        break;
                    }
                }
                SelectedIndex = index;
            }
        }

        public event EventHandler SelectedIndexChanged;

        internal ContextMenuStrip MenuForSmoke
        {
            get { return _menu; }
        }

        internal void OpenMenuForSmoke()
        {
            ShowMenu();
        }

        protected override AccessibleObject CreateAccessibilityInstance()
        {
            return new BetterUiSelectAccessibleObject(this);
        }

        protected override bool IsInputKey(Keys keyData)
        {
            var key = keyData & Keys.KeyCode;
            if (key == Keys.Up || key == Keys.Down || key == Keys.Home || key == Keys.End)
                return true;
            return base.IsInputKey(keyData);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var surface = _hover || _pressed ? WorkspaceChrome.Hover : BackColor;
            var border = Focused ? WorkspaceChrome.Focus : WorkspaceChrome.Line;
            var edge = ScaleMetric(Focused ? 2 : 1);

            using (var borderBrush = new SolidBrush(border))
                e.Graphics.FillRectangle(borderBrush, ClientRectangle);
            using (var surfaceBrush = new SolidBrush(surface))
                e.Graphics.FillRectangle(
                    surfaceBrush,
                    new Rectangle(
                        edge,
                        edge,
                        Math.Max(0, Width - (edge * 2)),
                        Math.Max(0, Height - (edge * 2))
                    )
                );

            var selected = SelectedItem;
            var text = selected == null ? "" : selected.ToString();
            var textInset = ScaleMetric(8);
            var arrowReserve = ScaleMetric(30);
            var textBounds = new Rectangle(
                textInset,
                0,
                Math.Max(0, Width - arrowReserve),
                Height
            );
            TextRenderer.DrawText(
                e.Graphics,
                text,
                Font,
                textBounds,
                ForeColor,
                TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis
            );

            var arrowColor = Focused ? WorkspaceChrome.Focus : ForeColor;
            using (var pen = new Pen(arrowColor, edge))
            {
                var cx = Width - ScaleMetric(13);
                var cy = Height / 2;
                var half = ScaleMetric(3);
                var rise = ScaleMetric(2);
                var drop = ScaleMetric(1);
                e.Graphics.DrawLine(pen, cx - half, cy - rise, cx, cy + drop);
                e.Graphics.DrawLine(pen, cx, cy + drop, cx + half, cy - rise);
            }
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            _hover = true;
            Invalidate();
            base.OnMouseEnter(e);
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            _hover = false;
            _pressed = false;
            Invalidate();
            base.OnMouseLeave(e);
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                Focus();
                _pressed = true;
                Invalidate();
            }
            base.OnMouseDown(e);
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            _pressed = false;
            Invalidate();
            base.OnMouseUp(e);
        }

        protected override void OnClick(EventArgs e)
        {
            base.OnClick(e);
            ShowMenu();
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (HandleKeyboardCommand(keyData)) return true;
            return base.ProcessCmdKey(ref msg, keyData);
        }

        private bool HandleKeyboardCommand(Keys keyData)
        {
            var keyCode = keyData & Keys.KeyCode;
            var alt = (keyData & Keys.Alt) == Keys.Alt;
            if (keyCode == Keys.Down && alt)
            {
                ShowMenu();
                return true;
            }
            if (keyCode == Keys.F4 || keyCode == Keys.Enter || keyCode == Keys.Space)
            {
                ShowMenu();
                return true;
            }
            if (keyCode == Keys.Down || keyCode == Keys.Up)
            {
                if (_items.Count > 0)
                {
                    var delta = keyCode == Keys.Down ? 1 : -1;
                    var next = _selectedIndex < 0 ? 0 : _selectedIndex + delta;
                    next = Math.Max(0, Math.Min(_items.Count - 1, next));
                    SelectedIndex = next;
                }
                return true;
            }
            if (keyCode == Keys.Home && _items.Count > 0)
            {
                SelectedIndex = 0;
                return true;
            }
            if (keyCode == Keys.End && _items.Count > 0)
            {
                SelectedIndex = _items.Count - 1;
                return true;
            }
            return false;
        }

        protected override void OnGotFocus(EventArgs e)
        {
            Invalidate();
            base.OnGotFocus(e);
        }

        protected override void OnLostFocus(EventArgs e)
        {
            _pressed = false;
            Invalidate();
            base.OnLostFocus(e);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) _menu.Dispose();
            base.Dispose(disposing);
        }

        private sealed class BetterUiSelectAccessibleObject : Control.ControlAccessibleObject
        {
            private readonly BetterUiSelect _owner;

            public BetterUiSelectAccessibleObject(BetterUiSelect owner)
                : base(owner)
            {
                _owner = owner;
            }

            public override AccessibleRole Role
            {
                get { return AccessibleRole.ComboBox; }
            }

            public override string Name
            {
                get
                {
                    return string.IsNullOrWhiteSpace(_owner.AccessibleName)
                        ? base.Name
                        : _owner.AccessibleName;
                }
                set { base.Name = value; }
            }

            public override string Value
            {
                get
                {
                    var selected = _owner.SelectedItem;
                    return selected == null ? "" : selected.ToString();
                }
                set
                {
                    if (value == null) return;
                    for (var i = 0; i < _owner.Items.Count; i++)
                    {
                        var item = _owner.Items[i];
                        if (item != null
                            && string.Equals(item.ToString(), value, StringComparison.OrdinalIgnoreCase))
                        {
                            _owner.SelectedIndex = i;
                            return;
                        }
                    }
                }
            }

            public override string DefaultAction
            {
                get { return "Open"; }
            }

            public override AccessibleStates State
            {
                get
                {
                    var state = base.State;
                    state &= ~(AccessibleStates.Expanded | AccessibleStates.Collapsed);
                    return state | (_owner._menu.Visible
                        ? AccessibleStates.Expanded
                        : AccessibleStates.Collapsed);
                }
            }

            public override void DoDefaultAction()
            {
                _owner.ShowMenu();
            }
        }

        private void ShowMenu()
        {
            if (_items.Count == 0 || IsDisposed) return;
            _menu.Items.Clear();
            _menu.Font = Font;
            _menu.Padding = new Padding(ScaleMetric(2));
            for (var i = 0; i < _items.Count; i++)
            {
                var index = i;
                var item = new ToolStripMenuItem(_items[i].ToString());
                item.AutoSize = false;
                item.Width = Math.Max(Width, ScaleMetric(96));
                item.Height = ScaleMetric(28);
                item.Padding = new Padding(ScaleMetric(8), 0, ScaleMetric(8), 0);
                item.Margin = Padding.Empty;
                item.BackColor = BackColor;
                item.ForeColor = i == _selectedIndex
                    ? WorkspaceChrome.Selected
                    : ForeColor;
                item.Checked = i == _selectedIndex;
                item.Click += delegate { SelectedIndex = index; };
                _menu.Items.Add(item);
            }
            _menu.AccessibleName = string.IsNullOrWhiteSpace(AccessibleName)
                ? "Options"
                : AccessibleName + " options";
            var workingArea = Screen.FromControl(this).WorkingArea;
            var top = PointToScreen(Point.Empty).Y;
            var bottom = PointToScreen(new Point(0, Height)).Y;
            var availableHeight = Math.Max(top - workingArea.Top, workingArea.Bottom - bottom);
            _menu.MaximumSize = new Size(
                Math.Max(Width, ScaleMetric(96)),
                Math.Min(ScaleMetric(320), Math.Max(ScaleMetric(96), availableHeight - ScaleMetric(8)))
            );
            _menu.Show(this, new Point(0, Height));
        }

        private int ScaleMetric(int logicalPixels)
        {
            return Math.Max(
                1,
                (int)Math.Round(
                    logicalPixels * Math.Max(96, DeviceDpi) / 96.0,
                    MidpointRounding.AwayFromZero
                )
            );
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
        private sealed class QuickSurfaceChoice
        {
            public string Id { get; set; }
            public string Label { get; set; }
            public override string ToString() { return Label; }
        }

        private const string TargetUrl = "https://pokepixel.nietore.com/play/";
        private const string TargetOrigin = "https://pokepixel.nietore.com";
        private const int ExpandedDeckMinimumWidth = 1520;
        private const int CompactStatusWidth = 64;
        private const int ExpandedStatusWidth = 112;
        private static readonly KeyValuePair<string, string>[] GameDockQuickSurfaces =
            WorkspaceQuickSurfaceCatalog.Default;
        private static readonly KeyValuePair<string, string>[] GameDockAllSurfaces =
            WorkspaceQuickSurfaceCatalog.All;

        private readonly string _baseDir;
        private readonly bool _smokeMode;
        private readonly bool _perfBaselineSmoke;
        private readonly bool _perfCyclesSmoke;
        private readonly bool _perfIdleSmoke;
        private readonly bool _perfIdleGame;
        private readonly bool _perfIdleMixed;
        private readonly bool _perfIdlePreflightSmoke;
        private readonly bool _perfVisibleFocusSmoke;
        private readonly bool _perfExtendedVisualSmoke;
        private readonly WorkspaceSavePhase? _shutdownSaveSmokePhase;
        private readonly bool _shutdownSaveSuccessSmoke;
        private bool IsShutdownSaveSmoke { get { return _shutdownSaveSmokePhase.HasValue || _shutdownSaveSuccessSmoke; } }
        private string ShutdownSaveSmokeLabel { get { return _shutdownSaveSuccessSmoke ? "success" : _shutdownSaveSmokePhase.Value.ToString().ToLowerInvariant(); } }
        private readonly bool _shutdownDuringInitSmoke;
        private readonly bool _shutdownDuringSwitchSmoke;
        private readonly bool _evidenceProbeEnabled;
        private readonly WorkspaceState _workspaceState;
        private readonly WorkspaceSettingsStore _settingsStore;
        private bool _settingsWriteAllowed;
        private string _lastSavedSettingsFingerprint;
        private bool _smokeFocusSaveProbe;
        private AccountPane _smokeCancelNextNavigationPane;
        private int _smokeResyncFailuresRemaining;
        private int _smokeResyncPostCount;
        private WorkspaceSettingsStore _smokeFocusSaveStore;
        private WorkspaceSavePhase? _smokeSaveFaultPhase;
        private int _smokeFocusSaveCalls;
        private readonly string _shutdownSmokeSettingsPath;
        private bool _shutdownSmokeFaultArmed;
        private int _shutdownSmokeFaultHits;
        private bool _shutdownSmokeFixtureReady;
        private AccountPane[] _shutdownSmokePanes;
        private byte[] _shutdownSmokeOriginalSettings;
        private string _shutdownSmokeOriginalFingerprint;
        private double _shutdownSmokeExpectedRatio;
        private bool _shutdownSmokeMenuDisposed;
        private bool _shutdownSmokeTimerDisposed;
        private bool _shutdownSmokeToolTipDisposed;
        private readonly string _dataRoot;
        private readonly WorkspacePerfMetrics _perfMetrics;
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
        private readonly ToolTip _toolTip;
        private readonly Dictionary<string, Button> _gameDockButtons =
            new Dictionary<string, Button>(StringComparer.OrdinalIgnoreCase);
        private readonly List<Button> _gameDockQuickButtons = new List<Button>();
        private readonly Dictionary<string, Button> _gameDockAccountButtons =
            new Dictionary<string, Button>(StringComparer.OrdinalIgnoreCase);
        private Panel _commandDeck;
        private Panel _gameDock;
        private Panel _gameDockEdge;
        private FlowLayoutPanel _gameDockGroup;
        private Label _gameDockProfileLabel;
        private Button _cardsViewButton;
        private Button _gameViewButton;
        private Button _gameDockOverflowButton;
        private ContextMenuStrip _gameDockOverflowMenu;
        private string _gameDockOverflowSignature;
        private Label _gameDockAvailabilityLabel;
        private FlowLayoutPanel _leftCommandGroup;
        private FlowLayoutPanel _rightCommandGroup;
        private Button _singleModeButton;
        private Button _dualModeButton;
        private BetterUiSelect _singleProfileSelector;
        private Label _singleStatus;
        private FlowLayoutPanel _dualLayoutGroup;
        private Button _leftAccountButton;
        private Button _rightAccountButton;
        private Button _layout12Button;
        private Button _layout11Button;
        private Button _layout21Button;
        private Button _swapButton;
        private Button _focusButton;
        private BetterUiSelect _scopeSelector;
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
        private Label _drawerAccountsLabel;
        private Label _drawerQuickProfileLabel;
        private Button _drawerEditQuickButton;
        private FlowLayoutPanel _drawerQuickEditor;
        private readonly List<BetterUiSelect> _drawerQuickSelectors = new List<BetterUiSelect>();
        private BetterUiSelect _drawerZoomSelector;
        private Button _drawerZoomResetButton;
        private Button _drawerRecoverButton;
        private Button _drawerHomeButton;
        private Button _drawerReloadButton;
        private Button _drawerDevToolsButton;
        private Button _drawerCopyButton;
        private Button _drawerResetLayoutButton;
        private bool _refreshingDrawerQuickEditor;
        private bool _refreshingDrawerZoom;
        private string _dockFeedbackProfileId;
        private string _dockFeedbackText;
        private readonly Dictionary<string, string> _latestDockUiRequestByProfile =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        private string _betterUiScript;
        private string _huntAnalyzerScript;
        private string _evidenceProbeScript;
        private string _webViewFocusedProfileId;
        private int _perfFocusRequestedCycle;
        private int _perfFocusReceived;
        private int _perfFocusCompleted;
        private int _perfFocusLastCompletedCycle;
        private string _perfFocusLastCompletedProfile;
        private int _bridgeRequestSequence;
        private bool _applyingLayout;
        private bool _updatingCommandDeck;
        private bool _isClosing;
        private bool _shutdownCleanupCompleted;
        private bool _shutdownSwitchProbeArmed;
        private DateTime _maintenanceDrawerAutoClosedAtUtc = DateTime.MinValue;

        public WorkspaceForm(
            string baseDir,
            bool smokeMode,
            bool shutdownDuringInitSmoke,
            bool shutdownDuringSwitchSmoke,
            bool evidenceProbeEnabled,
            bool perfMetricsEnabled,
            bool perfBaselineSmoke,
            bool perfCyclesSmoke,
            bool perfIdleSmoke,
            bool perfIdleGame,
            bool perfIdleMixed,
            bool perfIdlePreflightSmoke,
            bool perfVisibleFocusSmoke,
            bool perfExtendedVisualSmoke,
            WorkspaceSavePhase? shutdownSaveSmokePhase,
            bool shutdownSaveSuccessSmoke
        )
        {
            _baseDir = baseDir;
            _smokeMode = smokeMode;
            _shutdownSaveSmokePhase = smokeMode ? shutdownSaveSmokePhase : null;
            _shutdownSaveSuccessSmoke = smokeMode && shutdownSaveSuccessSmoke;
            _perfBaselineSmoke = smokeMode && (perfBaselineSmoke || perfCyclesSmoke);
            _perfCyclesSmoke = smokeMode && perfCyclesSmoke;
            _perfIdleSmoke = smokeMode && perfIdleSmoke;
            _perfIdleGame = _perfIdleSmoke && perfIdleGame;
            _perfIdleMixed = _perfIdleSmoke && perfIdleMixed;
            _perfIdlePreflightSmoke = smokeMode && perfIdlePreflightSmoke;
            _perfVisibleFocusSmoke = smokeMode && perfVisibleFocusSmoke;
            _perfExtendedVisualSmoke = smokeMode && perfExtendedVisualSmoke;
            _perfMetrics = perfMetricsEnabled ? new WorkspacePerfMetrics() : null;
            _shutdownDuringInitSmoke = shutdownDuringInitSmoke;
            _shutdownDuringSwitchSmoke = shutdownDuringSwitchSmoke;
            _evidenceProbeEnabled = evidenceProbeEnabled && !smokeMode;
            ProfileRegistry.Validate();
            var stateRoot = _smokeMode
                ? IsShutdownSaveSmoke
                    ? Path.Combine(_baseDir, "smoke", "shutdown-save-" + ShutdownSaveSmokeLabel)
                    : Path.Combine(_baseDir, "smoke", "runtime-state")
                : Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "PokePixelCoupledWorkspace"
                );
            Directory.CreateDirectory(stateRoot);
            _dataRoot = _smokeMode
                ? IsShutdownSaveSmoke
                    ? Path.Combine(_baseDir, "smoke-user-data-shutdown-" + ShutdownSaveSmokeLabel)
                    : Path.Combine(_baseDir, "smoke-user-data")
                : stateRoot;
            Directory.CreateDirectory(_dataRoot);
            _shutdownSmokeSettingsPath = Path.Combine(stateRoot, "workspace.json");
            _settingsStore = _shutdownSaveSmokePhase.HasValue
                ? new WorkspaceSettingsStore(_shutdownSmokeSettingsPath, InjectShutdownSaveFault)
                : new WorkspaceSettingsStore(_shutdownSmokeSettingsPath);
            var settingsWriteAllowed = true;
            _workspaceState = _smokeMode
                ? WorkspaceState.CreateBaseline()
                : _settingsStore.LoadOrDefault(out settingsWriteAllowed);
            _settingsWriteAllowed = settingsWriteAllowed;
            if (!_smokeMode && _settingsWriteAllowed)
                _lastSavedSettingsFingerprint = _settingsStore.NormalizedFingerprint(_workspaceState);

            Text = "PokePixel Coupled Workspace \u2014 WebView2";
            BackColor = WorkspaceChrome.Window;
            ForeColor = WorkspaceChrome.Text;
            AutoScaleDimensions = new SizeF(96.0f, 96.0f);
            AutoScaleMode = AutoScaleMode.Dpi;
            Width = 1600;
            Height = 960;
            MinimumSize = new Size(1180, 600);
            StartPosition = FormStartPosition.CenterScreen;
            Font = new Font("Segoe UI", 9.0f, FontStyle.Regular);
            _toolTip = new ToolTip();
            if (IsShutdownSaveSmoke)
                _toolTip.Disposed += delegate { _shutdownSmokeToolTipDisposed = true; };

            if (_smokeMode)
            {
                ShowInTaskbar = false;
                Opacity = _perfVisibleFocusSmoke ? 1 : 0;
                if (_perfVisibleFocusSmoke)
                {
                    Text = "CW-PERF-001 SYNTHETIC FOCUS / LOCAL HTML ONLY";
                    Width = 1180;
                    Height = 650;
                }
            }

            var root = new TableLayoutPanel();
            _rootLayout = root;
            root.Dock = DockStyle.Fill;
            root.Margin = Padding.Empty;
            root.Padding = Padding.Empty;
            root.RowCount = 3;
            root.ColumnCount = 1;
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
            root.BackColor = BackColor;
            Controls.Add(root);

            var toolbar = BuildToolbar(out _leftStatus, out _rightStatus);
            root.Controls.Add(toolbar, 0, 0);
            UpdateCommandDeck();
            LayoutCommandDeck();
            _commandDeck.Enabled = false;

            _split = new SplitContainer();
            _split.Dock = DockStyle.Fill;
            _split.Margin = Padding.Empty;
            _split.Orientation = Orientation.Vertical;
            _split.SplitterWidth = 8;
            _split.BackColor = WorkspaceChrome.Line;
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

            _gameDock = BuildGameDock();
            if (IsShutdownSaveSmoke)
                _gameDockOverflowMenu.Disposed += delegate { _shutdownSmokeMenuDisposed = true; };
            root.Controls.Add(_gameDock, 0, 2);
            UpdateGameDock();

            Shown += async delegate
            {
                if (!_smokeMode && !_settingsWriteAllowed)
                {
                    try { WarnAboutUnreadableWorkspaceSettings(this); }
                    catch (Exception warningError)
                    {
                        Console.Error.WriteLine("Workspace settings read warning failed: "
                            + warningError.GetType().Name);
                    }
                }
                ApplyWorkspaceDpiMetrics();
                await RunWorkspaceMutationAsync(InitializeAsync);
                // Actual WinForms/WebView2 focus is not available to a
                // zero-opacity synthetic form. Test a short, explicitly
                // visible *local-fixture* form only after startup releases
                // the normal mutation semaphore, never inside the gate.
                if (_perfVisibleFocusSmoke && !_isClosing)
                {
                    try
                    {
                        await RunVisibleSyntheticFocusSmokeAsync();
                        _smokeTimer.Stop();
                        Console.WriteLine("CW-PERF-001 visible local WebView2 GotFocus: 20/20 processed with owner PASS (visual smoke NOT RUN)");
                        Environment.ExitCode = 0;
                        Close();
                    }
                    catch (Exception ex)
                    {
                        if (_isClosing) return;
                        Console.Error.WriteLine(ex);
                        Environment.ExitCode = 1;
                        Close();
                    }
                }
            };
            Deactivate += delegate
            {
                if (_isClosing || _webViewFocusedProfileId == null) return;
                // After native Chromium owns focus, the outer WinForms
                // WebView2 wrapper is no longer Focused and may not receive
                // another LostFocus when the entire host is deactivated.
                // A different foreground window must clear only the focus
                // cue/owner, never the selected account or gameplay state.
                _webViewFocusedProfileId = null;
                if (!IsDisposed && !Disposing) UpdateCommandDeck();
            };
            FormClosing += delegate
            {
                BeginShutdown();
                // In the normal host the owner is still a valid, visible HWND.
                // Cleanup first, then show an owned warning before FormClosed.
                if (!_smokeMode) CompleteShutdown();
            };
            FormClosed += delegate { CompleteShutdown(); };
            Resize += delegate
            {
                if (_isClosing) return;
                if (_maintenanceDrawer != null && _maintenanceDrawer.Visible)
                    PositionMaintenanceDrawer();
            };
            LocationChanged += delegate
            {
                if (_isClosing) return;
                if (_maintenanceDrawer != null && _maintenanceDrawer.Visible)
                    PositionMaintenanceDrawer();
            };
            DpiChanged += delegate
            {
                if (_isClosing || !IsHandleCreated || IsDisposed || Disposing) return;
                BeginInvoke(new Action(delegate
                {
                    if (_isClosing || IsDisposed || Disposing) return;
                    ApplyWorkspaceDpiMetrics();
                    UpdateCommandDeck();
                    if (_maintenanceDrawer != null && _maintenanceDrawer.Visible)
                    {
                        ApplyMaintenanceDrawerDpiMetrics();
                        PositionMaintenanceDrawer();
                    }
                }));
            };

            _smokeTimer = new System.Windows.Forms.Timer();
            if (IsShutdownSaveSmoke)
                _smokeTimer.Disposed += delegate { _shutdownSmokeTimerDisposed = true; };
            // Twenty same-process WebView2 rebuild cycles can legitimately
            // exceed the short ordinary smoke budget. Keep this extended
            // watchdog exclusive to the opt-in synthetic cycle fixture.
            _smokeTimer.Interval = _perfCyclesSmoke ? 240000
                : _perfVisibleFocusSmoke ? 90000
                : _perfExtendedVisualSmoke ? 90000 : 12000;
            _smokeTimer.Tick += delegate
            {
                _smokeTimer.Stop();
                if (_smokeMode)
                {
                    Console.Error.WriteLine("WebView2 smoke timed out.");
                    Environment.ExitCode = IsShutdownSaveSmoke ? 4 : 1;
                    Close();
                }
            };

        }

        private void BeginShutdown()
        {
            if (_isClosing) return;
            _isClosing = true;

            _smokeTimer.Stop();

            if (_maintenanceDrawer != null && !_maintenanceDrawer.IsDisposed)
                _maintenanceDrawer.Hide();
            if (_gameDockOverflowMenu != null && !_gameDockOverflowMenu.IsDisposed)
                _gameDockOverflowMenu.Close(ToolStripDropDownCloseReason.CloseCalled);

            // Detach ToolTip from controls while their handles/top-level owner are still valid.
            // WebView2 and timer callbacks can run during teardown; _isClosing makes all later
            // tooltip/UI refreshes no-ops until final disposal in FormClosed.
            _toolTip.RemoveAll();
        }

        // This callback exists only in the explicit synthetic shutdown fixture.
        // It simulates an exception immediately BEFORE the named filesystem
        // operation; it does not claim to induce a Windows kernel I/O failure.
        private void InjectShutdownSaveFault(WorkspaceSavePhase phase)
        {
            if (!_shutdownSmokeFaultArmed || !_shutdownSaveSmokePhase.HasValue
                || phase != _shutdownSaveSmokePhase.Value) return;
            _shutdownSmokeFaultHits++;
            throw new IOException("Synthetic shutdown settings failure at " + phase);
        }

        private static void CompleteShutdownStep(string name, Action operation, List<string> failures)
        {
            try { operation(); }
            catch (Exception error)
            {
                // Do not print exception messages: settings paths may contain
                // private account names. No failed step may block later disposal.
                failures.Add(name + ":" + error.GetType().Name);
            }
        }

        private static bool ContainsSettingsShutdownFailure(List<string> failures)
        {
            if (failures == null) return false;
            foreach (var failure in failures)
                if (failure.StartsWith("settings:", StringComparison.Ordinal)) return true;
            return false;
        }

        private static void WarnAboutUnreadableWorkspaceSettings(IWin32Window owner)
        {
            MessageBox.Show(
                owner,
                "N\u00e3o foi poss\u00edvel ler as prefer\u00eancias existentes.\n"
                    + "Para proteger o arquivo anterior, altera\u00e7\u00f5es nesta sess\u00e3o n\u00e3o ser\u00e3o salvas.\n"
                    + "Verifique o acesso ao arquivo e reabra o aplicativo.",
                "PokePixel Better UI - prefer\u00eancias protegidas",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning
            );
        }

        private static void WarnAboutConcurrentWorkspaceSettings(IWin32Window owner)
        {
            MessageBox.Show(
                owner,
                "As prefer\u00eancias foram alteradas por outra inst\u00e2ncia do workspace.\n"
                    + "Para evitar sobrescrever essas altera\u00e7\u00f5es, esta sess\u00e3o deixar\u00e1 de salvar prefer\u00eancias.\n"
                    + "Feche as outras inst\u00e2ncias e reabra o aplicativo.",
                "PokePixel Better UI - prefer\u00eancias em conflito",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning
            );
        }

        private static void WarnAboutDisabledWorkspaceSettings(IWin32Window owner)
        {
            MessageBox.Show(
                owner,
                "N\u00e3o foi poss\u00edvel salvar as prefer\u00eancias do workspace.\n"
                    + "Para proteger o arquivo existente, esta sess\u00e3o n\u00e3o salvar\u00e1 novas altera\u00e7\u00f5es.\n"
                    + "Verifique o acesso de grava\u00e7\u00e3o e reabra o aplicativo.",
                "PokePixel Better UI - grava\u00e7\u00e3o desativada",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning
            );
        }

        private static void WarnAboutUnsavedWorkspaceSettings(IWin32Window owner)
        {
            // FormClosing has released the panes, menus and tooltips while its
            // owner is still valid. The synthetic FormClosed smoke never opens
            // this dialog. No private paths or exception messages are shown.
            // In a Windows /target:winexe build, stderr is not a user-visible
            // warning. Never include settings paths, profile IDs or exception
            // messages in this final native dialog.
            MessageBox.Show(
                owner,
                "N\u00e3o foi poss\u00edvel salvar as prefer\u00eancias do workspace.\n"
                    + "Algumas altera\u00e7\u00f5es recentes podem ter sido perdidas.\n"
                    + "Verifique o acesso de grava\u00e7\u00e3o e tente novamente.",
                "PokePixel Better UI - prefer\u00eancias n\u00e3o salvas",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning
            );
        }

        private void CompleteShutdown()
        {
            if (_shutdownCleanupCompleted) return;
            _shutdownCleanupCompleted = true;
            var failures = new List<string>();
            if (!_isClosing)
                CompleteShutdownStep("begin", BeginShutdown, failures);
            if (!_smokeMode || IsShutdownSaveSmoke)
                CompleteShutdownStep("settings", () => PersistWorkspaceState(true), failures);

            var panes = new List<AccountPane>(_panesByProfile.Values);
            _panesByProfile.Clear();
            foreach (var pane in panes)
                CompleteShutdownStep("pane", pane.Dispose, failures);

            if (_maintenanceDrawer != null && !_maintenanceDrawer.IsDisposed)
                CompleteShutdownStep("drawer", _maintenanceDrawer.Dispose, failures);
            if (_gameDockOverflowMenu != null && !_gameDockOverflowMenu.IsDisposed)
                CompleteShutdownStep("menu", _gameDockOverflowMenu.Dispose, failures);

            if (_smokeMode)
                CompleteShutdownStep("smoke-cleanup", RunShutdownLifecycleSmoke, failures);

            CompleteShutdownStep("timer", _smokeTimer.Dispose, failures);
            CompleteShutdownStep("tooltip", _toolTip.Dispose, failures);

            // No file writes or network telemetry: the optional report remains
            // available on demand through Copy Diagnostics while the form lives.
            if (_perfMetrics != null)
                CompleteShutdownStep("metrics", () => Console.WriteLine(_perfMetrics.Snapshot(
                    _smokeMode ? "synthetic-smoke" : "host-opt-in", 0, 0)), failures);

            if (IsShutdownSaveSmoke)
            {
                VerifyShutdownSaveSmoke(failures);
                return;
            }

            if (failures.Count > 0)
            {
                foreach (var failure in failures)
                    Console.Error.WriteLine("Workspace shutdown failed: " + failure);
                Environment.ExitCode = 1;
                if (!_smokeMode && ContainsSettingsShutdownFailure(failures))
                {
                    try { WarnAboutUnsavedWorkspaceSettings(this); }
                    catch (Exception warningError)
                    {
                        // A failed notification must not undo cleanup or
                        // incorrectly change the failing exit code.
                        Console.Error.WriteLine("Workspace shutdown warning failed: "
                            + warningError.GetType().Name);
                    }
                }
                return;
            }

            if (_shutdownDuringInitSmoke)
            {
                Console.WriteLine("WebView2 coupled workspace shutdown-during-init smoke: PASS");
                Environment.ExitCode = 0;
            }
            else if (_shutdownDuringSwitchSmoke)
            {
                Console.WriteLine("WebView2 coupled workspace shutdown-during-switch smoke: PASS");
                Environment.ExitCode = 0;
            }
        }

        private void VerifyShutdownSaveSmoke(List<string> failures)
        {
            // Check the actual objects after the real FormClosed -> CompleteShutdown
            // sequence, not an isolated delegate/disposal stand-in.
            var success = _shutdownSaveSuccessSmoke;
            var expectedOutcome = success
                ? !_shutdownSmokeFaultArmed && _shutdownSmokeFaultHits == 0
                    && failures.Count == 0 && !ContainsSettingsShutdownFailure(failures)
                : _shutdownSmokeFaultArmed && _shutdownSmokeFaultHits == 1 && failures.Count == 1
                    && string.Equals(failures[0], "settings:IOException", StringComparison.Ordinal)
                    && ContainsSettingsShutdownFailure(failures);
            var valid = _shutdownSmokeFixtureReady && expectedOutcome
                && _shutdownCleanupCompleted && _isClosing && _panesByProfile.Count == 0
                && _shutdownSmokePanes != null && _shutdownSmokePanes.Length == 2
                && !object.ReferenceEquals(_shutdownSmokePanes[0], _shutdownSmokePanes[1])
                && _shutdownSmokePanes[0].View == null && _shutdownSmokePanes[0].Environment == null
                && _shutdownSmokePanes[1].View == null && _shutdownSmokePanes[1].Environment == null
                && _shutdownSmokeMenuDisposed && _shutdownSmokeTimerDisposed
                && _shutdownSmokeToolTipDisposed
                && _gameDockOverflowMenu.IsDisposed
                && (success
                    ? !string.Equals(_lastSavedSettingsFingerprint,
                        _shutdownSmokeOriginalFingerprint, StringComparison.Ordinal)
                    : string.Equals(_lastSavedSettingsFingerprint,
                        _shutdownSmokeOriginalFingerprint, StringComparison.Ordinal));
            try
            {
                valid = valid && _shutdownSmokeOriginalSettings != null
                    && File.Exists(_shutdownSmokeSettingsPath)
                    && !File.Exists(_shutdownSmokeSettingsPath + ".tmp");
                if (valid)
                {
                    var current = File.ReadAllBytes(_shutdownSmokeSettingsPath);
                    var equalToOriginal = current.Length == _shutdownSmokeOriginalSettings.Length;
                    for (var i = 0; equalToOriginal && i < current.Length; i++)
                        equalToOriginal = current[i] == _shutdownSmokeOriginalSettings[i];
                    if (success)
                    {
                        var loaded = _settingsStore.LoadOrDefault();
                        valid = current.Length > 0 && !equalToOriginal
                            && _lastSavedSettingsFingerprint == _settingsStore.NormalizedFingerprint(loaded)
                            && loaded.Mode == WorkspaceMode.Dual
                            && loaded.ActiveProfileId == _workspaceState.ActiveProfileId
                            && loaded.CommandScope == _workspaceState.CommandScope
                            && loaded.CardsViewByProfile[ProfileRegistry.Rhyxus.Id] == false
                            && Math.Abs(loaded.ZoomByProfile[ProfileRegistry.Rhyosa.Id] - 1.25) < 0.0001
                            && Math.Abs(loaded.LayoutRatio - _workspaceState.LayoutRatio) < 0.0001
                            && Math.Abs(loaded.LastDualRatio - _workspaceState.LastDualRatio) < 0.0001
                            && Math.Abs(loaded.LayoutRatio - _shutdownSmokeExpectedRatio) < 0.0001
                            && Math.Abs(loaded.LastDualRatio - _shutdownSmokeExpectedRatio) < 0.0001
                            && Math.Abs(_shutdownSmokeExpectedRatio - 0.5) > 0.05;
                    }
                    else valid = equalToOriginal;
                }
            }
            catch (Exception error)
            {
                valid = false;
                Console.Error.WriteLine("CW-PERF-005 shutdown settings verification: " + error.GetType().Name);
            }

            if (valid)
            {
                if (success)
                {
                    Console.WriteLine("CW-PERF-005 shutdown success: FINAL SETTINGS SAVE + CLEANUP PASS (real FormClosed)");
                    Console.WriteLine("CW-PERF-005 shutdown: BOTH REAL PANES DISPOSED; MENU/TIMER/TOOLTIP DISPOSED; CHANGED FILE AND FINGERPRINT RELOADED");
                    Environment.ExitCode = 0;
                }
                else
                {
                    Console.WriteLine("CW-PERF-005 shutdown "
                        + ShutdownSaveSmokeLabel
                        + ": EXPECTED SETTINGS FAILURE + CLEANUP PASS (pre-operation simulation)");
                    Console.WriteLine("CW-PERF-005 shutdown: BOTH REAL PANES DISPOSED; MENU/TIMER/TOOLTIP DISPOSED; ORIGINAL FILE AND FINGERPRINT PRESERVED");
                    Environment.ExitCode = 1; // Intentional, never a successful smoke exit.
                }
            }
            else
            {
                Console.Error.WriteLine("CW-PERF-005 shutdown fixture FAIL: stage="
                    + ShutdownSaveSmokeLabel + " faultHits=" + _shutdownSmokeFaultHits
                    + " ready=" + _shutdownSmokeFixtureReady + " failures="
                    + string.Join(",", failures.ToArray()));
                Environment.ExitCode = 4; // Distinguishable from the expected nonzero 1.
            }
        }

        private void RunShutdownLifecycleSmoke()
        {
            if (!_isClosing)
                throw new InvalidOperationException("Shutdown lifecycle guard was not active.");
            if (_smokeTimer.Enabled)
                throw new InvalidOperationException("Shutdown left a WinForms timer running.");

            // Exercise the late UI-update sinks that can be reached by WebView2/timer callbacks.
            // They must remain harmless after pane disposal and tooltip detachment.
            UpdateGameDock();
            UpdateCommandDeck();
            RefreshMaintenanceDrawer();
            ApplyHealthToLabel(
                _leftStatus,
                "Shutdown smoke",
                PaneHealthState.Idle,
                "Shutdown smoke",
                false
            );
            SetToolTipSafe(_rightStatus, "Shutdown smoke");

            var latePane = EnsurePaneAsync(
                _workspaceState.ActiveProfileId,
                _leftHost,
                _leftStatus
            ).GetAwaiter().GetResult();
            RecoverActivePaneAsync().GetAwaiter().GetResult();
            SwitchToSingleAsync(_workspaceState.ActiveProfileId).GetAwaiter().GetResult();
            SwitchToDualAsync().GetAwaiter().GetResult();
            if (latePane != null || _panesByProfile.Count != 0)
                throw new InvalidOperationException("Shutdown allowed a late pane mutation.");
        }

        private void SetToolTipSafe(Control control, string text)
        {
            if (_isClosing
                || IsDisposed
                || Disposing
                || control == null
                || control.IsDisposed
                || control.Disposing)
            {
                return;
            }

            var owner = control.FindForm();
            if (owner == null || owner.IsDisposed || owner.Disposing) return;
            _toolTip.SetToolTip(control, text ?? string.Empty);
        }

        private Panel BuildToolbar(out Label leftStatus, out Label rightStatus)
        {
            var toolbar = new Panel();
            _commandDeck = toolbar;
            toolbar.Dock = DockStyle.Fill;
            toolbar.Margin = Padding.Empty;
            toolbar.BackColor = BackColor;
            toolbar.Padding = new Padding(8, 6, 8, 6);

            var leftGroup = MakeToolbarGroup();
            _leftCommandGroup = leftGroup;
            leftGroup.Dock = DockStyle.Left;

            _singleModeButton = MakeButton("1 ACC", 58, 0);
            _dualModeButton = MakeButton("2 ACC", 58, 0);
            leftGroup.Controls.Add(_singleModeButton);
            leftGroup.Controls.Add(_dualModeButton);

            _singleProfileSelector = MakeSelect(92);
            _singleProfileSelector.AccessibleName = "Account profile";
            foreach (var profile in ProfileRegistry.All())
                _singleProfileSelector.Items.Add(profile);
            leftGroup.Controls.Add(_singleProfileSelector);
            _singleStatus = MakeToolbarLabel("INIT", CompactStatusWidth);
            leftGroup.Controls.Add(_singleStatus);
            toolbar.Controls.Add(leftGroup);

            _dualLayoutGroup = MakeToolbarGroup();
            _dualLayoutGroup.Top = 6;

            _leftAccountButton = MakeButton("Rhyxus", 104, 0);
            leftStatus = MakeToolbarLabel("INIT", CompactStatusWidth);
            _layout12Button = MakeButton("1:2", 44, 0);
            _layout11Button = MakeButton("1:1", 44, 0);
            _layout21Button = MakeButton("2:1", 44, 0);
            _swapButton = MakeButton("Swap", 52, 0);
            _focusButton = MakeButton("Focus", 62, 0);
            _rightAccountButton = MakeButton("Rhyosa", 104, 0);
            rightStatus = MakeToolbarLabel("INIT", CompactStatusWidth);

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

            _scopeSelector = MakeSelect(72);
            _scopeSelector.AccessibleName = "Home and Reload command scope";
            _scopeSelector.Items.Add("Active");
            _scopeSelector.Items.Add("Both");
            _homeButton = MakeButton("Home", 56, 0);
            _reloadButton = MakeButton("Reload", 64, 0);
            _maintenanceButton = MakeButton("...", 28, 0);
            _maintenanceButton.AccessibleName = "Maintenance";

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
        private Panel BuildGameDock()
        {
            var dock = new Panel();
            dock.Dock = DockStyle.Fill;
            dock.Margin = Padding.Empty;
            dock.Padding = new Padding(8, 6, 8, 6);
            dock.BackColor = BackColor;

            _gameDockEdge = new Panel();
            _gameDockEdge.Dock = DockStyle.None;
            _gameDockEdge.Height = 1;
            _gameDockEdge.Location = Point.Empty;
            _gameDockEdge.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            _gameDockEdge.Margin = Padding.Empty;
            _gameDockEdge.BackColor = WorkspaceChrome.Line;
            _gameDockEdge.TabStop = false;
            dock.Controls.Add(_gameDockEdge);

            var group = MakeToolbarGroup();
            _gameDockGroup = group;
            _gameDockProfileLabel = MakeToolbarLabel("ACTIVE: RHYXUS", 132);
            _gameDockProfileLabel.ForeColor = WorkspaceChrome.Selected;
            group.Controls.Add(_gameDockProfileLabel);

            foreach (var profile in ProfileRegistry.All())
            {
                var profileId = profile.Id;
                var accountButton = MakeButton(profile.DisplayName, 80, 0);
                accountButton.AccessibleName = "Activate account " + profile.DisplayName;
                accountButton.Click += async delegate
                {
                    await RunWorkspaceMutationAsync(delegate
                    {
                        SetActiveProfile(profileId);
                        return Task.FromResult(0);
                    });
                };
                _gameDockAccountButtons.Add(profileId, accountButton);
                group.Controls.Add(accountButton);
            }

            _cardsViewButton = MakeButton("Cards", 64, 0);
            _cardsViewButton.AccessibleName = "Show card dashboard";
            _cardsViewButton.Click += delegate { SetContentView(true); };
            group.Controls.Add(_cardsViewButton);

            _gameViewButton = MakeButton("Game", 64, 0);
            _gameViewButton.AccessibleName = "Show game view";
            _gameViewButton.Click += delegate { SetContentView(false); };
            group.Controls.Add(_gameViewButton);

            _gameDockAvailabilityLabel = MakeToolbarLabel("MENUS OFFLINE", 112);
            _gameDockAvailabilityLabel.ForeColor = WorkspaceChrome.Error;
            _gameDockAvailabilityLabel.AccessibleName = "Native game menu unavailable";
            group.Controls.Add(_gameDockAvailabilityLabel);

            for (var slot = 0; slot < GameDockQuickSurfaces.Length; slot++)
            {
                var button = MakeButton("", 84, 0);
                button.Enabled = false;
                button.Click += delegate
                {
                    var surfaceId = button.Name;
                    if (!string.IsNullOrWhiteSpace(surfaceId)) OpenGameSurface(surfaceId);
                };
                _gameDockQuickButtons.Add(button);
                group.Controls.Add(button);
            }

            _gameDockOverflowMenu = new ContextMenuStrip();
            _gameDockOverflowMenu.ShowImageMargin = false;
            _gameDockOverflowMenu.ShowCheckMargin = false;
            _gameDockOverflowMenu.Padding = new Padding(2);
            _gameDockOverflowMenu.BackColor = BackColor;
            _gameDockOverflowMenu.ForeColor = ForeColor;
            _gameDockOverflowMenu.Renderer = new BetterUiMenuRenderer();
            _gameDockOverflowMenu.AccessibleName = "Additional game menus";

            _gameDockOverflowButton = MakeButton("Menus", 72, 0);
            _gameDockOverflowButton.Enabled = false;
            _gameDockOverflowButton.AccessibleName = "Additional game menus unavailable";
            _gameDockOverflowButton.Click += delegate { ShowGameDockOverflowMenu(); };
            group.Controls.Add(_gameDockOverflowButton);

            dock.Controls.Add(group);
            dock.Resize += delegate { LayoutGameDock(); };
            return dock;
        }

        private void LayoutGameDock()
        {
            if (_gameDock == null || _gameDockGroup == null) return;
            if (_gameDockEdge != null)
            {
                _gameDockEdge.Bounds = new Rectangle(
                    0,
                    0,
                    _gameDock.ClientSize.Width,
                    DpiMetric(1)
                );
                _gameDockEdge.BringToFront();
            }
            _gameDockGroup.PerformLayout();
            _gameDockGroup.Top = DpiMetric(6);
            _gameDockGroup.Left = Math.Max(
                DpiMetric(8),
                (_gameDock.ClientSize.Width - _gameDockGroup.Width) / 2
            );
        }

        private List<string> GetQuickGameDockSurfaces(string profileId)
        {
            List<string> favorites;
            if (_workspaceState.QuickSurfacesByProfile != null
                && _workspaceState.QuickSurfacesByProfile.TryGetValue(profileId, out favorites)
                && favorites != null && favorites.Count == GameDockQuickSurfaces.Length)
                return favorites;
            return WorkspaceQuickSurfaceCatalog.CreateDefault();
        }

        private string CompactGameDockLabel(string fullLabel)
        {
            var label = fullLabel;
            var width = DpiMetric(84) - DpiMetric(12);
            var flags = TextFormatFlags.NoPadding | TextFormatFlags.SingleLine;
            if (TextRenderer.MeasureText(label, Font, Size.Empty, flags).Width <= width)
                return label;
            while (label.Length > 1 && TextRenderer.MeasureText(
                label + "\u2026", Font, Size.Empty,
                flags
            ).Width > width)
                label = label.Substring(0, label.Length - 1);
            return label.TrimEnd() + "\u2026";
        }

        private void RefreshGameDockQuickButtons(ProfileDefinition profile, AccountPane pane, bool bridgeReady)
        {
            _gameDockButtons.Clear();
            var favorites = GetQuickGameDockSurfaces(profile.Id);
            for (var index = 0; index < _gameDockQuickButtons.Count; index++)
            {
                var button = _gameDockQuickButtons[index];
                var surfaceId = favorites[index];
                string label;
                if (!WorkspaceQuickSurfaceCatalog.TryGetLabel(surfaceId, out label)) continue;
                var available = bridgeReady && pane.AvailableSurfaces.Contains(surfaceId);
                button.Name = surfaceId;
                button.Text = CompactGameDockLabel(label);
                button.Enabled = available;
                button.AccessibleName = "Quick slot " + (index + 1) + ": open " + label
                    + " for " + profile.DisplayName + (available ? "" : " (unavailable)");
                SetToolTipSafe(button, label + " \u2014 " + profile.DisplayName);
                SetButtonSelected(button, false);
                _gameDockButtons[surfaceId] = button;
            }
        }

        private void UpdateGameDock()
        {
            if (_isClosing || _gameDockProfileLabel == null) return;
            var perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
            var profile = ProfileRegistry.Get(_workspaceState.ActiveProfileId);
            var pane = GetPaneForProfile(profile.Id);
            var bridgeReady = pane != null && pane.WorkspaceBridgeReady;
            var cardsViewActive = IsCardsViewActive(profile.Id);
            if (_gameDock != null) _gameDock.Visible = true;
            if (_rootLayout != null && _rootLayout.RowStyles.Count > 2)
                _rootLayout.RowStyles[2].Height = DpiMetric(44);
            var dual = _workspaceState.Mode == WorkspaceMode.Dual;
            _gameDockProfileLabel.Visible = !dual;
            _gameDockProfileLabel.Text = "ACTIVE: " + profile.DisplayName.ToUpperInvariant();
            _gameDockProfileLabel.AccessibleName = "Game Dock target: " + profile.DisplayName;
            foreach (var account in ProfileRegistry.All())
            {
                Button accountButton;
                if (!_gameDockAccountButtons.TryGetValue(account.Id, out accountButton)) continue;
                accountButton.Visible = dual;
                accountButton.Enabled = dual;
                var selected = string.Equals(account.Id, profile.Id, StringComparison.OrdinalIgnoreCase);
                var selectionChanged = !(accountButton.Tag is bool)
                    || (bool)accountButton.Tag != selected;
                accountButton.Text = selected ? "\u2713 " + account.DisplayName : account.DisplayName;
                accountButton.AccessibleName = selected
                    ? "Active account " + account.DisplayName
                    : "Activate account " + account.DisplayName;
                SetButtonSelected(accountButton, selected);
                if (selectionChanged)
                    ((BetterUiButton)accountButton).NotifyAccessibleStateChanged();
            }

            if (_cardsViewButton != null)
            {
                _cardsViewButton.Enabled = true;
                var accessibleName = cardsViewActive
                    ? "Cards view, current"
                    : "Show Cards view";
                if (!bridgeReady)
                    accessibleName += " (game menu unavailable)";
                var accessibilityChanged = !string.Equals(
                    _cardsViewButton.AccessibleName,
                    accessibleName,
                    StringComparison.Ordinal
                );
                _cardsViewButton.AccessibleName = accessibleName;
                SetButtonSelected(_cardsViewButton, cardsViewActive);
                if (accessibilityChanged)
                {
                    var cardsButton = _cardsViewButton as BetterUiButton;
                    if (cardsButton != null) cardsButton.NotifyAccessibleStateChanged();
                }
            }
            if (_gameViewButton != null)
            {
                _gameViewButton.Enabled = true;
                var accessibleName = !cardsViewActive
                    ? "Game view, current"
                    : "Show Game view";
                var accessibilityChanged = !string.Equals(
                    _gameViewButton.AccessibleName,
                    accessibleName,
                    StringComparison.Ordinal
                );
                _gameViewButton.AccessibleName = accessibleName;
                SetButtonSelected(_gameViewButton, !cardsViewActive);
                if (accessibilityChanged)
                {
                    var gameButton = _gameViewButton as BetterUiButton;
                    if (gameButton != null) gameButton.NotifyAccessibleStateChanged();
                }
            }
            if (_gameDockAvailabilityLabel != null)
            {
                var failed = string.Equals(
                    _dockFeedbackProfileId, profile.Id, StringComparison.OrdinalIgnoreCase
                ) && !string.IsNullOrWhiteSpace(_dockFeedbackText);
                _gameDockAvailabilityLabel.Visible = true;
                _gameDockAvailabilityLabel.Text = failed ? "OPEN FAILED"
                    : bridgeReady ? "MENUS READY" : "MENUS OFFLINE";
                _gameDockAvailabilityLabel.ForeColor = !bridgeReady || failed
                    ? WorkspaceChrome.Error : WorkspaceChrome.Subtle;
                _gameDockAvailabilityLabel.AccessibleName = failed
                    ? _dockFeedbackText + (bridgeReady ? "" : "; game menus offline")
                    : bridgeReady ? "Native game menus ready for " + profile.DisplayName
                    : "Native game menu unavailable for " + profile.DisplayName;
                SetToolTipSafe(_gameDockAvailabilityLabel, _gameDockAvailabilityLabel.AccessibleName);
            }
            RefreshGameDockQuickButtons(profile, pane, bridgeReady);
            RebuildGameDockOverflowMenu(pane, profile, bridgeReady);
            LayoutGameDock();
            if (_perfMetrics != null)
                _perfMetrics.Observe(WorkspacePerfSpan.GameDockUpdate, perfStarted);
        }

        private static void AddGameDockSignaturePart(StringBuilder signature, string value)
        {
            var text = value ?? string.Empty;
            signature.Append(text.Length).Append(':').Append(text);
        }

        private string GameDockOverflowSignature(AccountPane pane, ProfileDefinition profile, bool bridgeReady)
        {
            var signature = new StringBuilder();
            AddGameDockSignaturePart(signature, profile.Id);
            AddGameDockSignaturePart(signature, profile.DisplayName);
            AddGameDockSignaturePart(signature, bridgeReady ? "ready" : "offline");
            AddGameDockSignaturePart(signature, DeviceDpi.ToString(System.Globalization.CultureInfo.InvariantCulture));
            AddGameDockSignaturePart(signature, Font.ToString());
            AddGameDockSignaturePart(signature, ForeColor.ToArgb().ToString(System.Globalization.CultureInfo.InvariantCulture));
            AddGameDockSignaturePart(signature, BackColor.ToArgb().ToString(System.Globalization.CultureInfo.InvariantCulture));
            if (bridgeReady && pane != null)
            {
                foreach (var surface in GameDockAllSurfaces)
                {
                    if (IsQuickGameDockSurface(surface.Key)
                        || !pane.AvailableSurfaces.Contains(surface.Key)) continue;
                    AddGameDockSignaturePart(signature, surface.Key);
                    AddGameDockSignaturePart(signature, surface.Value);
                }
            }
            return signature.ToString();
        }

        private void RebuildGameDockOverflowMenu(AccountPane pane, ProfileDefinition profile, bool bridgeReady)
        {
            if (_gameDockOverflowMenu == null || _gameDockOverflowMenu.IsDisposed
                || _gameDockOverflowButton == null) return;
            var signature = GameDockOverflowSignature(pane, profile, bridgeReady);
            if (string.Equals(_gameDockOverflowSignature, signature, StringComparison.Ordinal))
            {
                // Focus can move even when the overflow's content stays identical.
                SetButtonSelected(_gameDockOverflowButton, false);
                return;
            }
            var perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
            _gameDockOverflowSignature = null;
            if (_gameDockOverflowMenu.Visible)
                _gameDockOverflowMenu.Close(ToolStripDropDownCloseReason.AppClicked);

            while (_gameDockOverflowMenu.Items.Count > 0)
            {
                var item = _gameDockOverflowMenu.Items[0];
                _gameDockOverflowMenu.Items.RemoveAt(0);
                item.Dispose();
            }

            var count = 0;
            if (bridgeReady && pane != null)
            {
                foreach (var definition in GameDockAllSurfaces)
                {
                    var surfaceId = definition.Key;
                    if (IsQuickGameDockSurface(surfaceId)
                        || !pane.AvailableSurfaces.Contains(surfaceId))
                        continue;

                    var item = new ToolStripMenuItem(definition.Value);
                    item.Tag = surfaceId;
                    item.Font = Font;
                    item.ForeColor = ForeColor;
                    item.AccessibleName = "Open " + definition.Value + " for " + profile.DisplayName;
                    item.Click += delegate { QueueGameDockSurfaceOpen(surfaceId); };
                    _gameDockOverflowMenu.Items.Add(item);
                    count++;
                }
            }

            _gameDockOverflowMenu.AccessibleName = "Additional game menus for " + profile.DisplayName;
            _gameDockOverflowButton.Enabled = bridgeReady && count > 0;
            _gameDockOverflowButton.AccessibleName = _gameDockOverflowButton.Enabled
                ? "Open additional game menus for " + profile.DisplayName + ", " + count + " available"
                : "Additional game menus for " + profile.DisplayName + " unavailable";
            SetButtonSelected(_gameDockOverflowButton, false);
            _gameDockOverflowSignature = signature;
            if (_perfMetrics != null)
            {
                _perfMetrics.Count(WorkspacePerfCounter.GameDockOverflowItemsCreated, count);
                _perfMetrics.Observe(WorkspacePerfSpan.GameDockOverflowRebuild, perfStarted);
            }
        }

        private void ShowGameDockOverflowMenu()
        {
            if (_isClosing
                || _gameDockOverflowButton == null
                || !_gameDockOverflowButton.Enabled
                || _gameDockOverflowMenu == null
                || _gameDockOverflowMenu.IsDisposed
                || _gameDockOverflowMenu.Items.Count == 0)
                return;

            var buttonBounds = _gameDockOverflowButton.RectangleToScreen(
                _gameDockOverflowButton.ClientRectangle
            );
            var workingArea = Screen.FromControl(_gameDockOverflowButton).WorkingArea;
            var availableAbove = Math.Max(
                DpiMetric(96),
                buttonBounds.Top - workingArea.Top - DpiMetric(8)
            );
            _gameDockOverflowMenu.MaximumSize = new Size(DpiMetric(320), availableAbove);
            _gameDockOverflowMenu.Show(
                _gameDockOverflowButton,
                new Point(0, 0),
                ToolStripDropDownDirection.AboveRight
            );
        }

        private void QueueGameDockSurfaceOpen(string surfaceId)
        {
            if (_isClosing
                || !IsGameDockSurface(surfaceId)
                || !IsHandleCreated
                || IsDisposed
                || Disposing)
                return;

            // Let the native ContextMenuStrip finish its click/close lifecycle before a Cards -> Game
            // transition rebuilds the overflow items. Pin the deferred action to the account that owned
            // the menu at click time so a concurrent profile switch cannot retarget the action.
            var expectedProfileId = _workspaceState.ActiveProfileId;
            BeginInvoke(new Action(delegate
            {
                if (_isClosing || IsDisposed || Disposing) return;
                if (!string.Equals(
                    expectedProfileId,
                    _workspaceState.ActiveProfileId,
                    StringComparison.OrdinalIgnoreCase
                ))
                    return;
                OpenGameSurface(surfaceId);
            }));
        }

        private ToolStripItem FindGameDockOverflowItem(string surfaceId)
        {
            if (_gameDockOverflowMenu == null || string.IsNullOrWhiteSpace(surfaceId)) return null;
            foreach (ToolStripItem item in _gameDockOverflowMenu.Items)
            {
                if (string.Equals(item.Tag as string, surfaceId, StringComparison.OrdinalIgnoreCase))
                    return item;
            }
            return null;
        }

        private bool SendContentView(AccountPane pane)
        {
            if (pane == null || !pane.WorkspaceBridgeReady) return false;
            if (pane.StrictViewSession && pane.ViewRevision == int.MaxValue)
            {
                pane.ResetWorkspaceBridge();
                return false;
            }
            var sent = TryPostWorkspaceBridgeMessage(
                pane,
                new WorkspaceBridgeMessage
                {
                    Type = WorkspaceBridgeProtocol.SetViewType,
                    Protocol = WorkspaceBridgeProtocol.Version,
                    ViewMode = pane.CardsViewActive ? "cards" : "game",
                    SessionId = pane.StrictViewSession ? pane.ViewSessionId : null,
                    DocumentEpoch = pane.StrictViewSession ? pane.ViewDocumentEpoch : null,
                    MountOrdinal = pane.StrictViewSession ? pane.ViewMountOrdinal : 0,
                    CapabilitySeq = pane.StrictViewSession ? pane.ViewCapabilitySeq : 0,
                    ViewRevision = pane.StrictViewSession ? ++pane.ViewRevision : 0
                }
            );
            if (sent && pane.ViewSendRetryScheduled)
            {
                pane.ViewSendRetryGeneration++;
                pane.ViewSendRetryScheduled = false;
            }
            if (!sent && pane.StrictViewSession && !pane.ViewSendRetryScheduled)
            {
                pane.ViewSendRetryScheduled = true;
                var generation = ++pane.ViewSendRetryGeneration;
                var retry = RetryContentViewDeliveryAsync(pane, pane.ViewDocumentEpoch,
                    pane.ViewSessionId, pane.ViewMountOrdinal, generation);
            }
            return sent;
        }

        private async Task RetryContentViewDeliveryAsync(AccountPane pane, string epoch,
            string sessionId, int mountOrdinal, int generation)
        {
            try
            {
                for (var attempt = 0; attempt < 3; attempt++)
                {
                    await Task.Delay(750);
                    if (_isClosing || pane.ViewSendRetryGeneration != generation
                        || !IsCurrentPane(pane)
                        || !pane.StrictViewSession || !pane.WorkspaceBridgeReady
                        || !pane.ViewDocumentCommitted
                        || !string.Equals(pane.ViewDocumentEpoch, epoch, StringComparison.Ordinal)
                        || !string.Equals(pane.ViewSessionId, sessionId, StringComparison.Ordinal)
                        || pane.ViewMountOrdinal != mountOrdinal) return;
                    // Always resend the latest desired mode with a higher
                    // revision, so an old intent never wins after recovery.
                    if (SendContentView(pane)) return;
                }
                if (_isClosing || pane.ViewSendRetryGeneration != generation
                    || !IsCurrentPane(pane) || !pane.StrictViewSession
                    || !string.Equals(pane.ViewDocumentEpoch, epoch, StringComparison.Ordinal)
                    || !string.Equals(pane.ViewSessionId, sessionId, StringComparison.Ordinal)) return;
                pane.ResetWorkspaceBridge();
                if (string.Equals(pane.Profile.Id, _workspaceState.ActiveProfileId,
                    StringComparison.OrdinalIgnoreCase)) UpdateGameDock();
                RequestCurrentViewCapabilities(pane);
            }
            finally
            {
                if (pane.ViewSendRetryGeneration == generation)
                    pane.ViewSendRetryScheduled = false;
            }
        }

        private bool RequestCurrentViewCapabilities(AccountPane pane)
        {
            if (pane == null || !pane.StrictViewSession || !pane.ViewDocumentCommitted)
                return false;
            var sent = PostCurrentViewCapabilityResync(pane);
            if (pane.ViewResyncRetryScheduled
                && pane.ViewResyncRetryCapabilitySeq != pane.ViewCapabilitySeq)
            {
                // A newer accepted capability generation supersedes the old
                // retry. If this new post fails it must start its OWN retries.
                pane.ViewResyncRetryGeneration++;
                pane.ViewResyncRetryScheduled = false;
            }
            if (!pane.WorkspaceBridgeReady && !pane.ViewResyncRetryScheduled)
            {
                pane.ViewResyncRetryScheduled = true;
                pane.ViewResyncRetryCapabilitySeq = pane.ViewCapabilitySeq;
                var generation = ++pane.ViewResyncRetryGeneration;
                var retry = RetryViewCapabilityResyncAsync(pane, pane.ViewDocumentEpoch,
                    pane.ViewSessionId, pane.ViewMountOrdinal, pane.ViewCapabilitySeq,
                    generation);
            }
            return sent;
        }

        private bool PostCurrentViewCapabilityResync(AccountPane pane)
        {
            if (_smokeMode)
            {
                _smokeResyncPostCount++;
                if (_smokeResyncFailuresRemaining > 0)
                {
                    _smokeResyncFailuresRemaining--;
                    return false;
                }
            }
            return TryPostWorkspaceBridgeMessage(pane, new WorkspaceBridgeMessage
            {
                Type = WorkspaceBridgeProtocol.ResyncCapabilitiesType,
                Protocol = WorkspaceBridgeProtocol.Version,
                SessionId = pane.ViewSessionId,
                DocumentEpoch = pane.ViewDocumentEpoch,
                MountOrdinal = pane.ViewMountOrdinal,
                CapabilitySeq = pane.ViewCapabilitySeq
            });
        }

        private async Task RetryViewCapabilityResyncAsync(AccountPane pane, string epoch,
            string sessionId, int mountOrdinal, int capabilitySeq, int generation)
        {
            try
            {
                for (var attempt = 0; attempt < 3; attempt++)
                {
                    await Task.Delay(750);
                    if (_isClosing || !IsCurrentPane(pane)
                        || pane.ViewResyncRetryGeneration != generation
                        || !pane.StrictViewSession || !pane.ViewDocumentCommitted
                        || pane.WorkspaceBridgeReady || pane.ViewCapabilitySeq != capabilitySeq
                        || !string.Equals(pane.ViewDocumentEpoch, epoch, StringComparison.Ordinal)
                        || !string.Equals(pane.ViewSessionId, sessionId, StringComparison.Ordinal)
                        || pane.ViewMountOrdinal != mountOrdinal) return;
                    PostCurrentViewCapabilityResync(pane);
                }
            }
            finally
            {
                if (pane.ViewResyncRetryGeneration == generation)
                    pane.ViewResyncRetryScheduled = false;
            }
        }

        private bool SetContentView(bool cards)
        {
            return SetContentView(_workspaceState.ActiveProfileId, cards);
        }

        private bool SetContentView(string profileId, bool cards)
        {
            ProfileDefinition profile;
            if (!ProfileRegistry.TryGet(profileId, out profile)) return false;
            var pane = GetPaneForProfile(profileId);
            var delivered = pane == null;
            if (_workspaceState.CardsViewByProfile == null)
                _workspaceState.CardsViewByProfile = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
            _workspaceState.CardsViewByProfile[profile.Id] = cards;
            if (pane != null)
            {
                pane.CardsViewActive = cards;
                delivered = SendContentView(pane);
            }
            if (!_smokeMode) PersistWorkspaceState();
            if (string.Equals(
                profile.Id,
                _workspaceState.ActiveProfileId,
                StringComparison.OrdinalIgnoreCase
            ))
                UpdateGameDock();
            return delivered;
        }

        private void OpenGameSurface(string surfaceId)
        {
            if (!IsGameDockSurface(surfaceId)) return;
            var pane = GetPaneForProfile(_workspaceState.ActiveProfileId);
            if (pane == null
                || !pane.WorkspaceBridgeReady
                || !pane.AvailableSurfaces.Contains(surfaceId)
                || pane.View == null
                || pane.View.CoreWebView2 == null)
                return;

            if (pane.CardsViewActive && !SetContentView(false)) return;

            var requestId = pane.Profile.Id + "-" + Interlocked.Increment(ref _bridgeRequestSequence);
            ClearDockOpenFeedback();
            _latestDockUiRequestByProfile[pane.Profile.Id] = requestId;
            pane.PendingWorkspaceRequests[requestId] = surfaceId;
            if (_perfMetrics != null)
            {
                _perfMetrics.Count(WorkspacePerfCounter.PendingRequestAdded);
                RecordPendingWorkspaceRequests();
            }
            try
            {
                pane.View.CoreWebView2.PostWebMessageAsJson(
                    WorkspaceBridgeProtocol.Serialize(new WorkspaceBridgeMessage
                    {
                        Type = WorkspaceBridgeProtocol.OpenSurfaceType,
                        Protocol = WorkspaceBridgeProtocol.Version,
                        RequestId = requestId,
                        SurfaceId = surfaceId,
                        SessionId = pane.StrictViewSession ? pane.ViewSessionId : null,
                        DocumentEpoch = pane.StrictViewSession ? pane.ViewDocumentEpoch : null,
                        MountOrdinal = pane.StrictViewSession ? pane.ViewMountOrdinal : 0,
                        CapabilitySeq = pane.StrictViewSession ? pane.ViewCapabilitySeq : 0
                    })
                );
            }
            catch
            {
                pane.PendingWorkspaceRequests.Remove(requestId);
                if (_perfMetrics != null)
                {
                    _perfMetrics.Count(WorkspacePerfCounter.PendingRequestPostFailed);
                    RecordPendingWorkspaceRequests();
                }
                pane.ResetWorkspaceBridge();
                SetDockOpenFailure(pane, surfaceId, requestId);
                UpdateGameDock();
                // A transient native-post failure must not leave the host
                // offline while the page still believes capabilities are
                // accepted and therefore suppresses an unchanged snapshot.
                RequestCurrentViewCapabilities(pane);
            }
        }

        private void ClearDockOpenFeedback()
        {
            _dockFeedbackProfileId = null;
            _dockFeedbackText = null;
        }

        private bool IsLatestDockUiRequest(AccountPane pane, string requestId)
        {
            string latest;
            return pane != null && !string.IsNullOrWhiteSpace(requestId)
                && _latestDockUiRequestByProfile.TryGetValue(pane.Profile.Id, out latest)
                && string.Equals(latest, requestId, StringComparison.Ordinal);
        }

        private void SetDockOpenFailure(AccountPane pane, string surfaceId, string requestId)
        {
            if (pane == null || !IsCurrentPane(pane) || !IsLatestDockUiRequest(pane, requestId)
                || !string.Equals(pane.Profile.Id, _workspaceState.ActiveProfileId, StringComparison.OrdinalIgnoreCase))
                return;
            string label;
            if (!WorkspaceQuickSurfaceCatalog.TryGetLabel(surfaceId, out label)) return;
            _dockFeedbackProfileId = pane.Profile.Id;
            _dockFeedbackText = "Could not open " + label + " for " + pane.Profile.DisplayName
                + ". Check the game menu or try again manually.";
        }

        private bool TryPostWorkspaceBridgeMessage(AccountPane pane, WorkspaceBridgeMessage message)
        {
            if (pane == null
                || !IsCurrentPane(pane)
                || pane.View == null
                || pane.View.CoreWebView2 == null
                || message == null)
                return false;
            try
            {
                pane.View.CoreWebView2.PostWebMessageAsJson(
                    WorkspaceBridgeProtocol.Serialize(message)
                );
                return true;
            }
            catch
            {
                return false;
            }
        }

        private bool IsCurrentBridgeMessageSource(AccountPane pane, string source)
        {
            if (pane == null
                || !IsCurrentPane(pane)
                || string.IsNullOrWhiteSpace(source)
                || string.IsNullOrWhiteSpace(pane.CurrentUrl))
                return false;
            if (!_smokeMode && !IsAllowedGameUrl(source)) return false;

            Uri sourceUri;
            Uri currentUri;
            if (!Uri.TryCreate(source, UriKind.Absolute, out sourceUri)
                || !Uri.TryCreate(pane.CurrentUrl, UriKind.Absolute, out currentUri))
                return false;
            var components = UriComponents.SchemeAndServer | UriComponents.PathAndQuery;
            var sourceDocument = sourceUri.GetComponents(components, UriFormat.SafeUnescaped);
            var currentDocument = currentUri.GetComponents(components, UriFormat.SafeUnescaped);
            return string.Equals(
                sourceDocument,
                currentDocument,
                StringComparison.OrdinalIgnoreCase
            );
        }

        private static bool SameDocumentAddress(string left, string right)
        {
            Uri first, second;
            if (!Uri.TryCreate(left, UriKind.Absolute, out first)
                || !Uri.TryCreate(right, UriKind.Absolute, out second)) return false;
            var components = UriComponents.SchemeAndServer | UriComponents.PathAndQuery;
            return string.Equals(first.GetComponents(components, UriFormat.SafeUnescaped),
                second.GetComponents(components, UriFormat.SafeUnescaped),
                StringComparison.OrdinalIgnoreCase);
        }

        private async Task TryRecoverInterruptedViewDocumentAsync(AccountPane pane,
            CoreWebView2 core, ulong failedNavigationId)
        {
            var snapshot = pane == null ? null : pane.InterruptedViewDocument;
            if (snapshot == null || _isClosing || !IsCurrentPane(pane)
                || !pane.IsInitialized || pane.View.CoreWebView2 != core
                || pane.ActiveNavigationId != failedNavigationId
                || pane.ViewReplacementContentStarted || pane.ViewDocumentCommitted) return;
            var pendingEpoch = pane.ViewDocumentEpoch;
            if (!_smokeMode && !IsAllowedGameUrl(snapshot.Url)) return;
            try
            {
                // Failed navigation may leave the old page, an error page or
                // no page. Only the live document closure proves identity.
                var probe = core.ExecuteScriptAsync(
                    "(function(){var p=document[Symbol.for('ppbui.coupled.document-session-probe')];"
                    + "return document.documentElement&&document.documentElement.isConnected"
                    + "&&typeof p==='function'?p():null;})()");
                if (await Task.WhenAny(probe, Task.Delay(2000)) != probe) return;
                var live = WorkspaceBridgeProtocol.Deserialize(await probe);
                if (live == null || live.Type != "ppbui.coupled.document-probe"
                    || live.Protocol != WorkspaceBridgeProtocol.Version
                    || !string.Equals(live.SessionId, snapshot.SessionId, StringComparison.Ordinal)
                    || !string.Equals(live.DocumentEpoch, snapshot.Epoch, StringComparison.Ordinal)
                    || live.MountOrdinal != snapshot.MountOrdinal
                    || !SameDocumentAddress(live.DocumentUrl, snapshot.Url)
                    || !SameDocumentAddress(core.Source, snapshot.Url)) return;
                if (_isClosing || !IsCurrentPane(pane) || pane.View == null
                    || pane.View.CoreWebView2 != core || pane.ActiveNavigationId != failedNavigationId
                    || pane.ViewReplacementContentStarted
                    || !string.Equals(pane.ViewDocumentEpoch, pendingEpoch, StringComparison.Ordinal)
                    || !pane.RestoreInterruptedViewDocument(snapshot)) return;
                // Retain the failed-navigation diagnostic and restore only by
                // a fresh capability advertisement, never pending native actions.
                RequestCurrentViewCapabilities(pane);
                if (string.Equals(pane.Profile.Id, _workspaceState.ActiveProfileId,
                    StringComparison.OrdinalIgnoreCase)) UpdateGameDock();
            }
            catch (Exception) { /* An unverifiable document stays offline. */ }
        }

        private static bool ValidViewSessionId(string id)
        {
            Guid parsed;
            return !string.IsNullOrWhiteSpace(id) && Guid.TryParseExact(id, "N", out parsed);
        }

        private static bool MatchesViewSession(AccountPane pane, WorkspaceBridgeMessage message)
        {
            return pane != null && message != null && pane.StrictViewSession
                && pane.ViewDocumentCommitted
                && string.Equals(message.DocumentEpoch, pane.ViewDocumentEpoch, StringComparison.Ordinal)
                && string.Equals(message.SessionId, pane.ViewSessionId, StringComparison.Ordinal)
                && message.MountOrdinal == pane.ViewMountOrdinal;
        }

        private static WorkspaceBridgeMessage WithCurrentSmokeViewSession(AccountPane pane, WorkspaceBridgeMessage message)
        {
            // Manually triggered synthetic host events must have the same
            // envelope as the actual isolated-page messages under strict mode.
            if (pane != null && pane.StrictViewSession && message != null)
            {
                message.SessionId = pane.ViewSessionId;
                message.DocumentEpoch = pane.ViewDocumentEpoch;
                message.MountOrdinal = pane.ViewMountOrdinal;
                if (message.Type == WorkspaceBridgeProtocol.CapabilitiesType)
                    message.CapabilitySeq = pane.ViewCapabilitySeq + 1;
            }
            return message;
        }

        private void HandleWorkspaceBridgeMessage(AccountPane pane, string json)
        {
            if (!IsCurrentPane(pane)) return;
            var message = WorkspaceBridgeProtocol.Deserialize(json);
            if (message == null || message.Protocol != WorkspaceBridgeProtocol.Version) return;

            if (string.Equals(message.Type, WorkspaceBridgeProtocol.SessionHelloType, StringComparison.Ordinal))
            {
                // A top-level old document can emit messages while the next
                // navigation is pending. Issue this epoch only after commit;
                // PostWebMessageAsJson then targets the current document.
                if (!pane.ViewDocumentCommitted || !ValidViewSessionId(message.SessionId)
                    || message.MountOrdinal <= 0 || string.IsNullOrWhiteSpace(message.RequestId)
                    || message.RequestId.Length > 100) return;
                if (pane.StrictViewSession
                    && (message.MountOrdinal < pane.ViewMountOrdinal
                        || (message.MountOrdinal == pane.ViewMountOrdinal
                            && !string.Equals(message.SessionId, pane.ViewSessionId, StringComparison.Ordinal)))) return;
                pane.IssueViewSession(message.SessionId, message.MountOrdinal);
                TryPostWorkspaceBridgeMessage(pane, new WorkspaceBridgeMessage
                {
                    Type = WorkspaceBridgeProtocol.SessionReadyType,
                    Protocol = WorkspaceBridgeProtocol.Version,
                    RequestId = message.RequestId,
                    SessionId = message.SessionId,
                    MountOrdinal = message.MountOrdinal,
                    DocumentEpoch = pane.ViewDocumentEpoch
                });
                return;
            }

            if (string.Equals(
                message.Type,
                WorkspaceBridgeProtocol.CapabilitiesType,
                StringComparison.Ordinal
            ))
            {
                var correlated = !string.IsNullOrWhiteSpace(message.DocumentEpoch)
                    || !string.IsNullOrWhiteSpace(message.SessionId)
                    || message.MountOrdinal != 0 || message.CapabilitySeq != 0;
                if (correlated)
                {
                    if (!pane.ViewDocumentCommitted
                        || !string.Equals(message.DocumentEpoch, pane.ViewDocumentEpoch, StringComparison.Ordinal)
                        || !ValidViewSessionId(message.SessionId)
                        || message.MountOrdinal <= 0 || message.CapabilitySeq <= 0
                        || !pane.HasIssuedViewSession(message.SessionId, message.MountOrdinal)) return;
                    if (pane.StrictViewSession
                        && (message.MountOrdinal < pane.ViewMountOrdinal
                            || (message.MountOrdinal == pane.ViewMountOrdinal
                                && (!string.Equals(message.SessionId, pane.ViewSessionId, StringComparison.Ordinal)
                                    || message.CapabilitySeq <= pane.ViewCapabilitySeq)))) return;
                }
                // The new production host advertises strict correlation in its
                // document marker. An older bundle must fail closed to native
                // Game/toolbar until upgraded, not silently authorize bare
                // capabilities from an old same-URL document. Only the local
                // synthetic host can exercise the legacy path explicitly.
                else if (pane.StrictViewSession || !_smokeMode) return;

                var sameSession = correlated && MatchesViewSession(pane, message);
                if (sameSession)
                {
                    // A native toolbar refresh must not erase an in-flight
                    // open-surface request owned by this same document.
                    pane.AvailableSurfaces.Clear();
                }
                else pane.ResetWorkspaceBridge();

                if (correlated)
                {
                    pane.StrictViewSession = true;
                    pane.ViewSessionId = message.SessionId;
                    pane.ViewMountOrdinal = message.MountOrdinal;
                    pane.ViewCapabilitySeq = message.CapabilitySeq;
                }
                var recognized = 0;
                if (message.Surfaces != null)
                {
                    foreach (var surface in message.Surfaces)
                    {
                        if (surface == null || !IsGameDockSurface(surface.Id)) continue;
                        recognized++;
                        if (surface.Available) pane.AvailableSurfaces.Add(surface.Id);
                    }
                }
                pane.WorkspaceBridgeReady = recognized > 0
                    && !string.IsNullOrWhiteSpace(message.RequestId);
                if (!TryPostWorkspaceBridgeMessage(
                    pane,
                    new WorkspaceBridgeMessage
                    {
                        Type = WorkspaceBridgeProtocol.CapabilitiesAcceptedType,
                        Protocol = WorkspaceBridgeProtocol.Version,
                        RequestId = message.RequestId,
                        Ok = pane.WorkspaceBridgeReady,
                        SessionId = correlated ? pane.ViewSessionId : null,
                        DocumentEpoch = correlated ? pane.ViewDocumentEpoch : null,
                        MountOrdinal = correlated ? pane.ViewMountOrdinal : 0,
                        CapabilitySeq = correlated ? pane.ViewCapabilitySeq : 0
                    }
                ))
                {
                    pane.ResetWorkspaceBridge();
                }
                else if (pane.WorkspaceBridgeReady)
                {
                    SendContentView(pane);
                }
                if (string.Equals(
                    pane.Profile.Id,
                    _workspaceState.ActiveProfileId,
                    StringComparison.OrdinalIgnoreCase
                ))
                    UpdateGameDock();
                return;
            }

            if (string.Equals(
                message.Type,
                WorkspaceBridgeProtocol.OpenSurfaceResultType,
                StringComparison.Ordinal
            ))
            {
                if (pane.StrictViewSession && !MatchesViewSession(pane, message)) return;
                string expectedSurface;
                if (string.IsNullOrWhiteSpace(message.RequestId)
                    || !pane.PendingWorkspaceRequests.TryGetValue(
                        message.RequestId,
                        out expectedSurface
                    )
                    || !string.Equals(
                        expectedSurface,
                        message.SurfaceId,
                        StringComparison.OrdinalIgnoreCase
                    ))
                    return;
                pane.PendingWorkspaceRequests.Remove(message.RequestId);
                if (_perfMetrics != null)
                {
                    _perfMetrics.Count(WorkspacePerfCounter.PendingRequestResolved);
                    RecordPendingWorkspaceRequests();
                }
                if (!message.Ok && IsGameDockSurface(message.SurfaceId))
                {
                    pane.AvailableSurfaces.Remove(message.SurfaceId);
                    SetDockOpenFailure(pane, message.SurfaceId, message.RequestId);
                    if (string.Equals(
                        pane.Profile.Id,
                        _workspaceState.ActiveProfileId,
                        StringComparison.OrdinalIgnoreCase
                    ))
                        UpdateGameDock();
                }
                else if (message.Ok && IsLatestDockUiRequest(pane, message.RequestId)
                    && string.Equals(
                    pane.Profile.Id, _workspaceState.ActiveProfileId, StringComparison.OrdinalIgnoreCase
                ))
                {
                    ClearDockOpenFeedback();
                    UpdateGameDock();
                }
            }
        }

        private static bool IsGameDockSurface(string surfaceId)
        {
            if (string.IsNullOrWhiteSpace(surfaceId)) return false;
            foreach (var definition in GameDockAllSurfaces)
                if (string.Equals(definition.Key, surfaceId, StringComparison.OrdinalIgnoreCase))
                    return true;
            return false;
        }

        private bool IsQuickGameDockSurface(string surfaceId)
        {
            if (string.IsNullOrWhiteSpace(surfaceId)) return false;
            foreach (var favorite in GetQuickGameDockSurfaces(_workspaceState.ActiveProfileId))
                if (string.Equals(favorite, surfaceId, StringComparison.OrdinalIgnoreCase))
                    return true;
            return false;
        }

        private static FlowLayoutPanel MakeToolbarGroup()
        {
            var group = new FlowLayoutPanel();
            group.AutoSize = true;
            group.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            group.WrapContents = false;
            group.Height = 32;
            group.MinimumSize = new Size(0, 32);
            group.Margin = new Padding(0);
            group.Padding = new Padding(0);
            return group;
        }

        private BetterUiSelect MakeSelect(int width)
        {
            var select = new BetterUiSelect();
            select.Width = width;
            select.Height = 28;
            select.Font = Font;
            select.Margin = new Padding(3, 2, 3, 2);
            select.GotFocus += delegate
            {
                _webViewFocusedProfileId = null;
                UpdateCommandDeck();
            };
            return select;
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

            ApplyResponsiveCommandDeckState();
            _leftCommandGroup.PerformLayout();
            _dualLayoutGroup.PerformLayout();
            _rightCommandGroup.PerformLayout();
            _commandDeck.PerformLayout();

            var safetyGap = DpiMetric(8);
            var leftEdge = _leftCommandGroup.Right + safetyGap;
            var rightEdge = _rightCommandGroup.Left - safetyGap;
            var desired = (_commandDeck.ClientSize.Width - _dualLayoutGroup.Width) / 2;
            var maximum = Math.Max(leftEdge, rightEdge - _dualLayoutGroup.Width);
            _dualLayoutGroup.Left = Math.Max(leftEdge, Math.Min(maximum, desired));
            _dualLayoutGroup.Top = DpiMetric(6);
        }

        private void ApplyResponsiveCommandDeckState()
        {
            var dual = _workspaceState.Mode == WorkspaceMode.Dual;
            var focusMode = dual && _workspaceState.FocusMode;
            var activeOnLeft = dual && string.Equals(
                _workspaceState.ActiveProfileId,
                _workspaceState.LeftProfileId,
                StringComparison.OrdinalIgnoreCase
            );
            var expanded = IsExpandedDeck();
            var statusWidth = DpiMetric(expanded ? ExpandedStatusWidth : CompactStatusWidth);

            _singleModeButton.Visible = !focusMode;
            _dualModeButton.Visible = !focusMode;
            _singleProfileSelector.Visible = !dual;
            _singleStatus.Visible = !dual;
            _dualLayoutGroup.Visible = dual;
            _scopeSelector.Visible = dual;

            _leftStatus.Width = statusWidth;
            _rightStatus.Width = statusWidth;
            _singleStatus.Width = statusWidth;
            _leftAccountButton.Width = DpiMetric(expanded ? 104 : 112);
            _rightAccountButton.Width = DpiMetric(expanded ? 104 : 112);

            _layout12Button.Visible = dual && !focusMode;
            _layout11Button.Visible = dual && !focusMode;
            _layout21Button.Visible = dual && !focusMode;
            _swapButton.Visible = dual && !focusMode;
            _leftAccountButton.Visible = dual && (!focusMode || activeOnLeft);
            _rightAccountButton.Visible = dual && (!focusMode || !activeOnLeft);
            _leftStatus.Visible = dual && (!focusMode || activeOnLeft);
            _rightStatus.Visible = dual && (!focusMode || !activeOnLeft);

            var leftName = ProfileRegistry.Get(_workspaceState.LeftProfileId).DisplayName;
            var rightName = ProfileRegistry.Get(_workspaceState.RightProfileId).DisplayName;
            _leftAccountButton.Text = leftName;
            _rightAccountButton.Text = rightName;

            ArrangeDualLayoutGroup(focusMode, activeOnLeft);
            RefreshHealthLabelsForLayout(expanded);
        }

        private static int ScaleLogicalPixels(int logicalPixels, int dpi)
        {
            return Math.Max(
                1,
                (int)Math.Round(
                    logicalPixels * Math.Max(96, dpi) / 96.0,
                    MidpointRounding.AwayFromZero
                )
            );
        }

        private int DpiMetric(int logicalPixels)
        {
            var dpi = IsHandleCreated ? Math.Max(96, DeviceDpi) : 96;
            return ScaleLogicalPixels(logicalPixels, dpi);
        }

        private int DrawerDpiMetric(int logicalPixels)
        {
            var dpi = _maintenanceDrawer != null && _maintenanceDrawer.IsHandleCreated
                ? Math.Max(96, _maintenanceDrawer.DeviceDpi)
                : IsHandleCreated ? Math.Max(96, DeviceDpi) : 96;
            return ScaleLogicalPixels(logicalPixels, dpi);
        }

        private Padding DpiPadding(int left, int top, int right, int bottom)
        {
            return new Padding(
                DpiMetric(left),
                DpiMetric(top),
                DpiMetric(right),
                DpiMetric(bottom)
            );
        }

        private bool IsExpandedDeck()
        {
            return _commandDeck != null
                && _commandDeck.ClientSize.Width >= DpiMetric(ExpandedDeckMinimumWidth);
        }

        private void ApplyWorkspaceDpiMetrics()
        {
            MinimumSize = new Size(DpiMetric(1180), DpiMetric(600));
            if (_rootLayout != null && _rootLayout.RowStyles.Count > 0)
                _rootLayout.RowStyles[0].Height = DpiMetric(44);
            if (_rootLayout != null && _rootLayout.RowStyles.Count > 2)
                _rootLayout.RowStyles[2].Height = _gameDock != null && _gameDock.Visible ? DpiMetric(44) : 0;
            if (_commandDeck != null)
                _commandDeck.Padding = DpiPadding(8, 6, 8, 6);
            if (_gameDock != null)
                _gameDock.Padding = DpiPadding(8, 6, 8, 6);
            if (_gameDockEdge != null)
                _gameDockEdge.Height = DpiMetric(1);
            if (_split != null)
            {
                _split.SplitterWidth = DpiMetric(8);
                _split.Panel1MinSize = DpiMetric(320);
                _split.Panel2MinSize = DpiMetric(320);
            }
            if (_leftHost != null) _leftHost.Padding = new Padding(0, DpiMetric(2), 0, 0);
            if (_rightHost != null) _rightHost.Padding = new Padding(0, DpiMetric(2), 0, 0);

            var groups = new[] { _leftCommandGroup, _dualLayoutGroup, _rightCommandGroup, _gameDockGroup };
            foreach (var group in groups)
            {
                if (group == null) continue;
                group.Height = DpiMetric(32);
                group.MinimumSize = new Size(0, DpiMetric(32));
            }

            var toolbarControls = new Control[]
            {
                _singleModeButton,
                _dualModeButton,
                _singleProfileSelector,
                _singleStatus,
                _leftAccountButton,
                _leftStatus,
                _layout12Button,
                _layout11Button,
                _layout21Button,
                _swapButton,
                _focusButton,
                _rightAccountButton,
                _rightStatus,
                _scopeSelector,
                _homeButton,
                _reloadButton,
                _maintenanceButton
            };
            foreach (var control in toolbarControls)
            {
                if (control == null) continue;
                control.Height = DpiMetric(28);
                control.Margin = DpiPadding(3, 2, 3, 2);
                var button = control as Button;
                if (button != null) button.FlatAppearance.BorderSize = DpiMetric(button.Focused ? 2 : 1);
            }

            if (_gameDockProfileLabel != null)
            {
                _gameDockProfileLabel.Height = DpiMetric(28);
                _gameDockProfileLabel.Width = DpiMetric(132);
                _gameDockProfileLabel.Margin = DpiPadding(3, 2, 3, 2);
            }
            foreach (var accountButton in _gameDockAccountButtons.Values)
            {
                accountButton.Width = DpiMetric(80);
                accountButton.Height = DpiMetric(28);
                accountButton.Margin = DpiPadding(3, 2, 3, 2);
                accountButton.FlatAppearance.BorderSize = DpiMetric(accountButton.Focused ? 2 : 1);
            }
            if (_gameDockAvailabilityLabel != null)
            {
                _gameDockAvailabilityLabel.Height = DpiMetric(28);
                _gameDockAvailabilityLabel.Width = DpiMetric(112);
                _gameDockAvailabilityLabel.Margin = DpiPadding(3, 2, 3, 2);
            }
            foreach (var viewButton in new[] { _cardsViewButton, _gameViewButton })
            {
                if (viewButton == null) continue;
                viewButton.Width = DpiMetric(64);
                viewButton.Height = DpiMetric(28);
                viewButton.Margin = DpiPadding(3, 2, 3, 2);
                viewButton.FlatAppearance.BorderSize = DpiMetric(viewButton.Focused ? 2 : 1);
            }
            foreach (var button in _gameDockQuickButtons)
            {
                button.Width = DpiMetric(84);
                button.Height = DpiMetric(28);
                button.Margin = DpiPadding(3, 2, 3, 2);
                button.FlatAppearance.BorderSize = DpiMetric(button.Focused ? 2 : 1);
            }
            if (_gameDockOverflowButton != null)
            {
                _gameDockOverflowButton.Width = DpiMetric(72);
                _gameDockOverflowButton.Height = DpiMetric(28);
                _gameDockOverflowButton.Margin = DpiPadding(3, 2, 3, 2);
                _gameDockOverflowButton.FlatAppearance.BorderSize = DpiMetric(_gameDockOverflowButton.Focused ? 2 : 1);
            }

            ApplyResponsiveCommandDeckState();
            PerformLayout();
            LayoutCommandDeck();
            UpdateGameDock();
        }

        private void ArrangeDualLayoutGroup(bool focusMode, bool activeOnLeft)
        {
            if (_dualLayoutGroup == null) return;
            Control[] order;
            if (focusMode && activeOnLeft)
            {
                order = new Control[]
                {
                    _leftAccountButton,
                    _leftStatus,
                    _focusButton,
                    _layout12Button,
                    _layout11Button,
                    _layout21Button,
                    _swapButton,
                    _rightAccountButton,
                    _rightStatus
                };
            }
            else if (focusMode)
            {
                order = new Control[]
                {
                    _rightAccountButton,
                    _rightStatus,
                    _focusButton,
                    _layout12Button,
                    _layout11Button,
                    _layout21Button,
                    _swapButton,
                    _leftAccountButton,
                    _leftStatus
                };
            }
            else
            {
                order = new Control[]
                {
                    _leftAccountButton,
                    _leftStatus,
                    _layout12Button,
                    _layout11Button,
                    _layout21Button,
                    _swapButton,
                    _focusButton,
                    _rightAccountButton,
                    _rightStatus
                };
            }

            _dualLayoutGroup.SuspendLayout();
            try
            {
                for (var i = 0; i < order.Length; i++)
                    order[i].TabIndex = i;
                for (var i = order.Length - 1; i >= 0; i--)
                    _dualLayoutGroup.Controls.SetChildIndex(order[i], 0);
            }
            finally
            {
                _dualLayoutGroup.ResumeLayout(false);
            }
        }

        private void SetButtonSelected(Button button, bool selected, bool externalFocusCue)
        {
            if (button == null) return;
            var gold = WorkspaceChrome.Selected;
            var cyan = WorkspaceChrome.Focus;
            var stone = WorkspaceChrome.Line;
            button.FlatAppearance.BorderSize = DpiMetric(button.Focused || externalFocusCue ? 2 : 1);
            button.Tag = selected;
            button.FlatAppearance.BorderColor = button.Focused || externalFocusCue
                ? cyan
                : selected ? gold : stone;
            button.BackColor = WorkspaceChrome.Interactive;
            button.ForeColor = selected ? gold : ForeColor;
        }

        private void SetButtonSelected(Button button, bool selected)
        {
            SetButtonSelected(button, selected, false);
        }

        private void UpdateCommandDeck()
        {
            if (_isClosing || _singleModeButton == null) return;
            _updatingCommandDeck = true;
            try
            {
                var single = _workspaceState.Mode == WorkspaceMode.Single;
                var focusMode = !single && _workspaceState.FocusMode;
                SetButtonSelected(_singleModeButton, single);
                SetButtonSelected(_dualModeButton, !single);
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
                var leftName = ProfileRegistry.Get(_workspaceState.LeftProfileId).DisplayName;
                var rightName = ProfileRegistry.Get(_workspaceState.RightProfileId).DisplayName;
                _leftAccountButton.AccessibleName = leftActive
                    ? "Active account " + leftName
                    : "Account " + leftName;
                _rightAccountButton.AccessibleName = rightActive
                    ? "Active account " + rightName
                    : "Account " + rightName;
                SetButtonSelected(
                    _leftAccountButton,
                    leftActive,
                    string.Equals(
                        _webViewFocusedProfileId,
                        _workspaceState.LeftProfileId,
                        StringComparison.OrdinalIgnoreCase
                    )
                );
                SetButtonSelected(
                    _rightAccountButton,
                    rightActive,
                    string.Equals(
                        _webViewFocusedProfileId,
                        _workspaceState.RightProfileId,
                        StringComparison.OrdinalIgnoreCase
                    )
                );

                SetButtonSelected(_layout12Button, IsCurrentLayoutPreset(1.0 / 3.0));
                SetButtonSelected(_layout11Button, IsCurrentLayoutPreset(0.5));
                SetButtonSelected(_layout21Button, IsCurrentLayoutPreset(2.0 / 3.0));
                _focusButton.Text = _workspaceState.FocusMode ? "Restore" : "Focus";
                _focusButton.AccessibleName = _workspaceState.FocusMode
                    ? "Restore dual layout"
                    : "Focus active account";
                _scopeSelector.SelectedIndex = _workspaceState.CommandScope == CommandScope.Both ? 1 : 0;
                UpdatePaneRails();
            }
            finally
            {
                _updatingCommandDeck = false;
            }
            LayoutCommandDeck();
            UpdateGameDock();
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

            if (!string.Equals(_workspaceState.ActiveProfileId, profile.Id, StringComparison.OrdinalIgnoreCase))
            {
                ClearDockOpenFeedback();
                if (_perfMetrics != null)
                    _perfMetrics.Count(WorkspacePerfCounter.ActiveProfileChanged);
            }
            _workspaceState.ActiveProfileId = profile.Id;
            if (_workspaceState.FocusMode) ApplyFocusLayout();
            try
            {
                if (!_smokeMode || _smokeFocusSaveProbe) PersistWorkspaceState();
            }
            finally
            {
                // A disk failure must never leave the selected account/ARIA
                // or the native focused-pane cue out of sync with memory.
                UpdateCommandDeck();
            }
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
            _maintenanceDrawer.Location = _maintenanceButton.PointToScreen(Point.Empty);
            _maintenanceDrawer.Show(this);
            ApplyMaintenanceDrawerDpiMetrics();
            PositionMaintenanceDrawer();
            _maintenanceDrawer.BringToFront();
            _workspaceState.MaintenanceDrawerExpanded = true;
            if (!_smokeMode) PersistWorkspaceState();
            if (_drawerRecoverButton != null) _drawerRecoverButton.Focus();
        }

        private Form CreateMaintenanceDrawer()
        {
            _drawerQuickSelectors.Clear();
            var drawer = new MaintenanceDrawerForm();
            drawer.AutoScaleDimensions = new SizeF(96.0f, 96.0f);
            drawer.AutoScaleMode = AutoScaleMode.Dpi;
            drawer.FormBorderStyle = FormBorderStyle.None;
            drawer.ShowInTaskbar = false;
            drawer.StartPosition = FormStartPosition.Manual;
            drawer.Width = 360;
            drawer.Height = 430;
            drawer.MinimumSize = new Size(360, 220);
            drawer.MaximumSize = new Size(360, 480);
            drawer.BackColor = WorkspaceChrome.Line;
            drawer.ForeColor = ForeColor;
            drawer.Font = Font;
            drawer.KeyPreview = true;
            drawer.Padding = new Padding(0);

            var surface = new Panel();
            surface.Dock = DockStyle.Fill;
            surface.BackColor = WorkspaceChrome.Line;
            surface.Padding = new Padding(1);
            drawer.Controls.Add(surface);
            _maintenanceDrawerSurface = surface;

            var body = new BetterUiFlowLayoutPanel();
            body.Dock = DockStyle.Fill;
            body.FlowDirection = FlowDirection.TopDown;
            body.WrapContents = false;
            body.BackColor = WorkspaceChrome.Window;
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

            body.Controls.Add(MakeDrawerHeading("ACCOUNT HEALTH (READ ONLY)"));
            _drawerAccountsLabel = MakeDrawerText(326, 100);
            body.Controls.Add(_drawerAccountsLabel);

            _drawerCopyButton = MakeButton("Copy diagnostics", 146, 0);
            _drawerCopyButton.Click += delegate { CopyDiagnostics(); };
            body.Controls.Add(_drawerCopyButton);

            body.Controls.Add(MakeDrawerHeading("ACTIVE ACCOUNT ZOOM"));
            var zoomRow = MakeToolbarGroup();
            _drawerZoomSelector = MakeDrawerCombo(154, "Zoom for active account");
            foreach (var factor in WorkspaceZoomPresets.Factors)
                _drawerZoomSelector.Items.Add((int)Math.Round(factor * 100) + "%");
            _drawerZoomSelector.SelectedIndexChanged += delegate
            {
                if (_refreshingDrawerZoom || _drawerZoomSelector.SelectedIndex < 0) return;
                var factor = WorkspaceZoomPresets.Factors[_drawerZoomSelector.SelectedIndex];
                SetProfileZoom(_workspaceState.ActiveProfileId, factor);
            };
            _drawerZoomResetButton = MakeButton("Reset 100%", 104, 0);
            _drawerZoomResetButton.AccessibleName = "Reset active account zoom to 100 percent";
            _drawerZoomResetButton.Click += delegate { SetProfileZoom(_workspaceState.ActiveProfileId, 1.0); };
            zoomRow.Controls.Add(_drawerZoomSelector);
            zoomRow.Controls.Add(_drawerZoomResetButton);
            body.Controls.Add(zoomRow);

            body.Controls.Add(MakeDrawerHeading("GAME DOCK SHORTCUTS"));
            _drawerQuickProfileLabel = MakeDrawerText(326, 20);
            body.Controls.Add(_drawerQuickProfileLabel);
            _drawerEditQuickButton = MakeButton("Edit 7 shortcuts", 148, 0);
            _drawerEditQuickButton.AccessibleName = "Edit seven Game Dock shortcuts for active account";
            _drawerEditQuickButton.Click += delegate
            {
                _drawerQuickEditor.Visible = !_drawerQuickEditor.Visible;
                _drawerEditQuickButton.Text = _drawerQuickEditor.Visible
                    ? "Close shortcuts" : "Edit 7 shortcuts";
                if (_drawerQuickEditor.Visible && _drawerQuickSelectors.Count > 0)
                    _drawerQuickSelectors[0].Focus();
            };
            body.Controls.Add(_drawerEditQuickButton);

            _drawerQuickEditor = new FlowLayoutPanel();
            _drawerQuickEditor.FlowDirection = FlowDirection.TopDown;
            _drawerQuickEditor.WrapContents = false;
            _drawerQuickEditor.AutoSize = true;
            _drawerQuickEditor.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            _drawerQuickEditor.Margin = Padding.Empty;
            _drawerQuickEditor.Visible = false;
            for (var slot = 0; slot < GameDockQuickSurfaces.Length; slot++)
            {
                var index = slot;
                var row = MakeToolbarGroup();
                var slotLabel = MakeLabel("Slot " + (index + 1), 56);
                slotLabel.Height = 28;
                slotLabel.TextAlign = ContentAlignment.MiddleLeft;
                row.Controls.Add(slotLabel);
                var selector = MakeDrawerCombo(246, "Quick slot " + (index + 1) + " destination");
                foreach (var definition in GameDockAllSurfaces)
                    selector.Items.Add(new QuickSurfaceChoice { Id = definition.Key, Label = definition.Value });
                selector.SelectedIndexChanged += delegate
                {
                    if (_refreshingDrawerQuickEditor) return;
                    var option = selector.SelectedItem as QuickSurfaceChoice;
                    if (option != null) SetGameDockQuickSlot(_workspaceState.ActiveProfileId, index, option.Id);
                };
                _drawerQuickSelectors.Add(selector);
                row.Controls.Add(selector);
                _drawerQuickEditor.Controls.Add(row);
            }
            body.Controls.Add(_drawerQuickEditor);

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
            drawer.DpiChanged += delegate
            {
                if (_isClosing || !drawer.IsHandleCreated || drawer.IsDisposed) return;
                drawer.BeginInvoke(new Action(delegate
                {
                    if (_isClosing || drawer.IsDisposed) return;
                    ApplyMaintenanceDrawerDpiMetrics();
                    PositionMaintenanceDrawer();
                }));
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
            if (_isClosing) return;
            HideMaintenanceDrawer();
            BeginInvoke(new Action(delegate
            {
                if (_isClosing
                    || IsDisposed
                    || Disposing
                    || _maintenanceButton == null
                    || _maintenanceButton.IsDisposed)
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
            label.ForeColor = WorkspaceChrome.Focus;
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

        private BetterUiSelect MakeDrawerCombo(int width, string accessibleName)
        {
            return new BetterUiSelect
            {
                Width = width,
                Height = 28,
                Margin = new Padding(3, 2, 3, 2),
                BackColor = WorkspaceChrome.Interactive,
                ForeColor = ForeColor,
                Font = Font,
                AccessibleName = accessibleName
            };
        }

        private void SetGameDockQuickSlot(string profileId, int index, string surfaceId)
        {
            if (_isClosing || !string.Equals(
                profileId, _workspaceState.ActiveProfileId, StringComparison.OrdinalIgnoreCase
            )) return;
            string canonicalId;
            if (!WorkspaceQuickSurfaceCatalog.TryGetCanonicalId(surfaceId, out canonicalId)
                || index < 0 || index >= GameDockQuickSurfaces.Length) return;

            var favorites = new List<string>(GetQuickGameDockSurfaces(profileId));
            var otherIndex = favorites.FindIndex(id => string.Equals(
                id, canonicalId, StringComparison.OrdinalIgnoreCase
            ));
            if (otherIndex == index) return;
            if (otherIndex >= 0) favorites[otherIndex] = favorites[index];
            favorites[index] = canonicalId;
            _workspaceState.QuickSurfacesByProfile[profileId] = favorites;
            if (!_smokeMode) PersistWorkspaceState();
            UpdateGameDock();
            RefreshQuickEditor();
        }

        private void RefreshQuickEditor()
        {
            if (_drawerQuickProfileLabel == null || _isClosing) return;
            var profile = ProfileRegistry.Get(_workspaceState.ActiveProfileId);
            _drawerQuickProfileLabel.Text = profile.DisplayName + " \u00B7 7 slots \u00B7 duplicate choices swap";
            _drawerQuickProfileLabel.AccessibleName = "Game Dock shortcuts for "
                + profile.DisplayName + ". Selecting a destination already in another slot"
                + " swaps those two slots, so each menu remains unique.";
            SetToolTipSafe(_drawerQuickProfileLabel, _drawerQuickProfileLabel.AccessibleName);
            var favorites = GetQuickGameDockSurfaces(profile.Id);
            _refreshingDrawerQuickEditor = true;
            try
            {
                for (var i = 0; i < _drawerQuickSelectors.Count && i < favorites.Count; i++)
                {
                    var combo = _drawerQuickSelectors[i];
                    for (var choice = 0; choice < combo.Items.Count; choice++)
                    {
                        var option = combo.Items[choice] as QuickSurfaceChoice;
                        if (option == null || !string.Equals(
                            option.Id, favorites[i], StringComparison.OrdinalIgnoreCase
                        )) continue;
                        if (combo.SelectedIndex != choice) combo.SelectedIndex = choice;
                        break;
                    }
                }
            }
            finally { _refreshingDrawerQuickEditor = false; }
        }

        private bool TryApplyPaneZoom(AccountPane pane)
        {
            if (_isClosing || pane == null || !IsCurrentPane(pane)
                || pane.View == null || pane.View.IsDisposed || !pane.IsInitialized)
                return false;
            try
            {
                double value;
                if (!_workspaceState.ZoomByProfile.TryGetValue(pane.Profile.Id, out value)) value = 1.0;
                pane.View.ZoomFactor = WorkspaceZoomPresets.Normalize(value);
                return true;
            }
            catch (Exception ex)
            {
                pane.LastErrorText = "Zoom failed: " + ex.GetType().Name;
                return false;
            }
        }

        private void SetProfileZoom(string profileId, double factor)
        {
            if (_isClosing || !string.Equals(
                profileId, _workspaceState.ActiveProfileId, StringComparison.OrdinalIgnoreCase
            )) return;
            factor = WorkspaceZoomPresets.Normalize(factor);
            _workspaceState.ZoomByProfile[profileId] = factor;
            var pane = GetPaneForProfile(profileId);
            if (pane != null) TryApplyPaneZoom(pane);
            if (!_smokeMode) PersistWorkspaceState();
            RefreshZoomEditor();
        }

        private void RefreshZoomEditor()
        {
            if (_drawerZoomSelector == null || _isClosing) return;
            double factor;
            if (!_workspaceState.ZoomByProfile.TryGetValue(_workspaceState.ActiveProfileId, out factor))
                factor = 1.0;
            factor = WorkspaceZoomPresets.Normalize(factor);
            _refreshingDrawerZoom = true;
            try
            {
                for (var i = 0; i < WorkspaceZoomPresets.Factors.Length; i++)
                {
                    if (Math.Abs(WorkspaceZoomPresets.Factors[i] - factor) < 0.001)
                    {
                        if (_drawerZoomSelector.SelectedIndex != i) _drawerZoomSelector.SelectedIndex = i;
                        break;
                    }
                }
                _drawerZoomSelector.AccessibleName = "Zoom for active account "
                    + ProfileRegistry.Get(_workspaceState.ActiveProfileId).DisplayName;
            }
            finally { _refreshingDrawerZoom = false; }
        }

        private void PositionMaintenanceDrawer()
        {
            if (_isClosing || _maintenanceDrawer == null || _maintenanceButton == null) return;
            var trigger = _maintenanceButton.PointToScreen(
                new Point(_maintenanceButton.Width, _maintenanceButton.Height)
            );
            var working = Screen.FromPoint(trigger).WorkingArea;
            var margin = DrawerDpiMetric(8);
            var minimumHeight = DrawerDpiMetric(220);
            var maximumHeight = DrawerDpiMetric(480);
            var drawerWidth = _maintenanceDrawer.Width;
            var height = Math.Min(
                maximumHeight,
                Math.Max(minimumHeight, working.Bottom - trigger.Y - margin)
            );
            _maintenanceDrawer.Height = height;
            _maintenanceDrawer.Location = ClampDrawerLocation(
                trigger,
                working,
                new Size(drawerWidth, height)
            );
        }

        private static Point ClampDrawerLocation(
            Point trigger,
            Rectangle workingArea,
            Size drawerSize
        )
        {
            var maximumX = Math.Max(workingArea.Left, workingArea.Right - drawerSize.Width);
            var maximumY = Math.Max(workingArea.Top, workingArea.Bottom - drawerSize.Height);
            return new Point(
                Math.Max(
                    workingArea.Left,
                    Math.Min(maximumX, trigger.X - drawerSize.Width)
                ),
                Math.Max(workingArea.Top, Math.Min(maximumY, trigger.Y))
            );
        }

        private void ApplyMaintenanceDrawerDpiMetrics()
        {
            if (_isClosing || _maintenanceDrawer == null || _maintenanceDrawer.IsDisposed) return;
            var width = DrawerDpiMetric(360);
            _maintenanceDrawer.MinimumSize = new Size(width, DrawerDpiMetric(220));
            _maintenanceDrawer.MaximumSize = new Size(width, DrawerDpiMetric(480));
            _maintenanceDrawer.Width = width;
            if (_maintenanceDrawerSurface != null)
                _maintenanceDrawerSurface.Padding = new Padding(DrawerDpiMetric(1));

            var drawerButtons = new[]
            {
                _drawerRecoverButton,
                _drawerHomeButton,
                _drawerReloadButton,
                _drawerDevToolsButton,
                _drawerCopyButton,
                _drawerEditQuickButton,
                _drawerZoomResetButton,
                _drawerResetLayoutButton
            };
            foreach (var button in drawerButtons)
            {
                if (button == null) continue;
                button.Height = DrawerDpiMetric(28);
                button.Margin = new Padding(
                    DrawerDpiMetric(3),
                    DrawerDpiMetric(2),
                    DrawerDpiMetric(3),
                    DrawerDpiMetric(2)
                );
                button.FlatAppearance.BorderSize = DrawerDpiMetric(button.Focused ? 2 : 1);
            }

            var browserRow = _drawerHomeButton == null
                ? null
                : _drawerHomeButton.Parent as FlowLayoutPanel;
            if (browserRow != null)
            {
                browserRow.Height = DrawerDpiMetric(32);
                browserRow.MinimumSize = new Size(0, DrawerDpiMetric(32));
            }
            if (_drawerZoomSelector != null)
            {
                _drawerZoomSelector.Width = DrawerDpiMetric(154);
                _drawerZoomSelector.Height = DrawerDpiMetric(28);
            }
            foreach (var combo in _drawerQuickSelectors)
            {
                combo.Width = DrawerDpiMetric(246);
                combo.Height = DrawerDpiMetric(28);
                combo.Margin = new Padding(
                    DrawerDpiMetric(3), DrawerDpiMetric(2),
                    DrawerDpiMetric(3), DrawerDpiMetric(2)
                );
                var row = combo.Parent as FlowLayoutPanel;
                if (row != null)
                {
                    row.Height = DrawerDpiMetric(32);
                    row.MinimumSize = new Size(0, DrawerDpiMetric(32));
                }
            }
            _maintenanceDrawer.PerformLayout();
        }

        private void HideMaintenanceDrawer()
        {
            if (_isClosing || _maintenanceDrawer == null || !_maintenanceDrawer.Visible) return;
            _maintenanceDrawer.Hide();
            _workspaceState.MaintenanceDrawerExpanded = false;
            if (!_smokeMode) PersistWorkspaceState();
            if (_maintenanceButton != null && _maintenanceButton.CanFocus)
                _maintenanceButton.Focus();
        }

        private void RefreshMaintenanceDrawer()
        {
            if (_isClosing || _drawerSessionLabel == null) return;
            var active = GetPaneForProfile(_workspaceState.ActiveProfileId);
            var left = GetPaneForSide(PaneSide.Left);
            var right = GetPaneForSide(PaneSide.Right);

            _drawerSessionLabel.Text =
                "Mode: " + _workspaceState.Mode
                + "  Active: " + ProfileRegistry.Get(_workspaceState.ActiveProfileId).DisplayName
                + Environment.NewLine
                + "Left: " + (left == null ? "\u2014" : left.Profile.DisplayName)
                + "  Right: " + (right == null ? "\u2014" : right.Profile.DisplayName);

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
            if (_drawerAccountsLabel != null)
            {
                var diagnosticLines = new List<string>();
                foreach (var account in ProfileRegistry.All())
                {
                    var accountPane = GetPaneForProfile(account.Id);
                    var health = accountPane == null ? "Not initialized" : accountPane.HealthText;
                    var error = accountPane == null || string.IsNullOrWhiteSpace(accountPane.LastErrorText)
                        ? "None" : accountPane.LastErrorText;
                    if (health.Length > 48) health = health.Substring(0, 48) + "\u2026";
                    if (error.Length > 90) error = error.Substring(0, 90) + "\u2026";
                    diagnosticLines.Add(account.DisplayName + ": " + health + " | Error: " + error);
                }
                _drawerAccountsLabel.Text = string.Join(Environment.NewLine, diagnosticLines.ToArray());
                _drawerAccountsLabel.AccessibleName = "All account health and errors: "
                    + _drawerAccountsLabel.Text;
                SetToolTipSafe(_drawerAccountsLabel, _drawerAccountsLabel.Text);
            }
            RefreshZoomEditor();
            RefreshQuickEditor();
        }

        private async Task RecoverActivePaneAsync()
        {
            if (_isClosing) return;
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
            if (_isClosing) return;
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
            // In opt-in synthetic perf mode, the on-demand report contains
            // metrics ONLY; do not mix in the normal diagnostics URL fields.
            if (_perfMetrics != null)
                return _perfMetrics.Snapshot("synthetic-smoke",
                    _panesByProfile.Count, CountPendingWorkspaceRequests());

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
            TryApplyPaneZoom(GetPaneForProfile(ProfileRegistry.Rhyxus.Id));
            TryApplyPaneZoom(GetPaneForProfile(ProfileRegistry.Rhyosa.Id));

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
            var button = new BetterUiButton();
            button.Text = text;
            button.Width = width;
            button.Height = 28;
            button.Left = left;
            button.Margin = new Padding(3, 2, 3, 2);
            button.Padding = Padding.Empty;
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderSize = 1;
            button.FlatAppearance.BorderColor = WorkspaceChrome.Line;
            button.FlatAppearance.MouseOverBackColor = WorkspaceChrome.Hover;
            button.FlatAppearance.MouseDownBackColor = WorkspaceChrome.Window;
            button.BackColor = WorkspaceChrome.Interactive;
            button.ForeColor = ForeColor;
            button.UseVisualStyleBackColor = false;
            button.GotFocus += delegate
            {
                _webViewFocusedProfileId = null;
                SetButtonSelected(button, button.Tag is bool && (bool)button.Tag);
            };
            button.LostFocus += delegate
            {
                if (!button.IsDisposed) UpdateCommandDeck();
            };
            return button;
        }

        private Label MakeToolbarLabel(string text, int width)
        {
            var label = MakeLabel(text, width);
            label.Height = 28;
            label.TextAlign = ContentAlignment.MiddleLeft;
            label.Margin = new Padding(3, 2, 3, 2);
            return label;
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
            host.BackColor = WorkspaceChrome.Line;
            return host;
        }

        private AccountPane GetPaneForProfile(string profileId)
        {
            AccountPane pane;
            return profileId != null && _panesByProfile.TryGetValue(profileId, out pane)
                ? pane
                : null;
        }

        private bool GetCardsViewPreference(string profileId)
        {
            bool cards;
            return profileId != null
                && _workspaceState.CardsViewByProfile != null
                && _workspaceState.CardsViewByProfile.TryGetValue(profileId, out cards)
                    ? cards
                    : true;
        }

        private bool IsCardsViewActive(string profileId)
        {
            var pane = GetPaneForProfile(profileId);
            return pane != null ? pane.CardsViewActive : GetCardsViewPreference(profileId);
        }

        private bool AreAllVisibleProfilesCards()
        {
            if (_workspaceState.Mode == WorkspaceMode.Single)
                return IsCardsViewActive(_workspaceState.SingleProfileId);
            if (_workspaceState.FocusMode)
                return IsCardsViewActive(_workspaceState.ActiveProfileId);
            return IsCardsViewActive(_workspaceState.LeftProfileId)
                && IsCardsViewActive(_workspaceState.RightProfileId);
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
            var gold = WorkspaceChrome.Selected;
            var neutral = WorkspaceChrome.Line;

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

        private static string HealthDeckText(PaneHealthState state, bool expanded)
        {
            if (expanded)
            {
                switch (state)
                {
                    case PaneHealthState.Idle: return "IDLE";
                    case PaneHealthState.Initializing: return "INITIALIZING";
                    case PaneHealthState.Loading: return "LOADING";
                    case PaneHealthState.Ready: return "READY";
                    case PaneHealthState.UiReady: return "UI READY";
                    case PaneHealthState.Error: return "ERROR";
                    case PaneHealthState.ProcessFailed: return "PROCESS FAILED";
                    case PaneHealthState.Blocked: return "BLOCKED URL";
                    default: return "STATUS";
                }
            }

            switch (state)
            {
                case PaneHealthState.Idle: return "IDLE";
                case PaneHealthState.Initializing: return "INIT";
                case PaneHealthState.Loading: return "LOAD";
                case PaneHealthState.Ready: return "READY";
                case PaneHealthState.UiReady: return "UI OK";
                case PaneHealthState.Error: return "ERROR";
                case PaneHealthState.ProcessFailed: return "FAILED";
                case PaneHealthState.Blocked: return "BLOCK";
                default: return "STATUS";
            }
        }

        private void ApplyHealthToLabel(
            Label status,
            string profileName,
            PaneHealthState state,
            string detail,
            bool expanded
        )
        {
            if (_isClosing || status == null || status.IsDisposed || status.Disposing) return;
            status.Text = HealthDeckText(state, expanded);
            status.ForeColor = HealthColor(state);
            var full = string.IsNullOrWhiteSpace(detail)
                ? status.Text
                : detail;
            status.AccessibleName = profileName + " health: " + full;
            SetToolTipSafe(status, full);
        }

        private void RefreshHealthLabelsForLayout(bool expanded)
        {
            var singleProfile = ProfileRegistry.Get(_workspaceState.SingleProfileId);
            var singlePane = GetPaneForProfile(singleProfile.Id);
            ApplyHealthToLabel(
                _singleStatus,
                singleProfile.DisplayName,
                singlePane == null ? PaneHealthState.Initializing : singlePane.HealthState,
                singlePane == null ? "Initializing" : singlePane.HealthText,
                expanded
            );

            var leftProfile = ProfileRegistry.Get(_workspaceState.LeftProfileId);
            var leftPane = GetPaneForProfile(leftProfile.Id);
            ApplyHealthToLabel(
                _leftStatus,
                leftProfile.DisplayName,
                leftPane == null ? PaneHealthState.Initializing : leftPane.HealthState,
                leftPane == null ? "Initializing" : leftPane.HealthText,
                expanded
            );

            var rightProfile = ProfileRegistry.Get(_workspaceState.RightProfileId);
            var rightPane = GetPaneForProfile(rightProfile.Id);
            ApplyHealthToLabel(
                _rightStatus,
                rightProfile.DisplayName,
                rightPane == null ? PaneHealthState.Initializing : rightPane.HealthState,
                rightPane == null ? "Initializing" : rightPane.HealthText,
                expanded
            );
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
            if (_isClosing || !IsCurrentPane(pane)) return;
            pane.HealthState = state;
            pane.HealthText = text;
            var status = GetStatusLabelForProfile(pane.Profile.Id);
            if (status == null) return;
            var expanded = IsExpandedDeck();
            ApplyHealthToLabel(status, pane.Profile.DisplayName, state, text, expanded);
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
            pane.View.DefaultBackgroundColor = WorkspaceChrome.Window;
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
            RecordPendingWorkspaceRequests();
        }

        private int CountPendingWorkspaceRequests()
        {
            var total = 0;
            foreach (var pane in _panesByProfile.Values)
                total += pane.PendingWorkspaceRequests.Count;
            return total;
        }

        private void RecordPendingWorkspaceRequests()
        {
            if (_perfMetrics != null)
                _perfMetrics.SetPendingCount(CountPendingWorkspaceRequests());
        }

        private async Task<AccountPane> EnsurePaneAsync(
            string profileId,
            Panel host,
            Label status
        )
        {
            if (_isClosing) return null;
            var pane = GetPaneForProfile(profileId);
            var created = false;
            if (pane == null)
            {
                pane = new AccountPane(ProfileRegistry.Get(profileId), _perfMetrics);
                if (_perfMetrics != null) _perfMetrics.PaneCreated(profileId);
                pane.CardsViewActive = GetCardsViewPreference(profileId);
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
                ApplyHealthToLabel(
                    status,
                    pane.Profile.DisplayName,
                    PaneHealthState.Initializing,
                    "Initializing",
                    IsExpandedDeck()
                );
            }
            pane.HealthState = PaneHealthState.Initializing;
            pane.HealthText = "Initializing";

            var perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
            try
            {
                var initializationTask = pane.InitializeAsync(_dataRoot);
                if (_shutdownDuringInitSmoke || _shutdownSwitchProbeArmed)
                {
                    _shutdownSwitchProbeArmed = false;
                    BeginInvoke(new Action(Close));
                    // Force this lifecycle action to yield with pane initialization still in flight.
                    // The queued Close runs on the UI thread before this continuation can proceed.
                    await Task.Delay(50);
                }
                await initializationTask;
                if (_isClosing || !IsCurrentPane(pane)) return null;

                ConfigureView(pane);
                if (_isClosing || !IsCurrentPane(pane)) return null;
                TryApplyPaneZoom(pane);

                if (_smokeMode)
                {
                    var smokeScriptStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
                    try
                    {
                        await pane.View.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
                            BuildWorkspaceBridgeSmokeScript(pane.Profile.Id)
                        );
                    }
                    finally
                    {
                        if (_perfMetrics != null)
                            _perfMetrics.Observe(WorkspacePerfSpan.RegisterSmokeScript, smokeScriptStarted);
                    }
                    if (_isClosing || !IsCurrentPane(pane)) return null;
                }
                else
                {
                    if (_evidenceProbeEnabled)
                    {
                        if (_evidenceProbeScript == null) _evidenceProbeScript = LoadEvidenceProbeScript();
                        await RegisterEvidenceProbeAsync(pane.View, _evidenceProbeScript);
                        if (_isClosing || !IsCurrentPane(pane)) return null;
                        pane.EvidenceCapture = await EvidenceDevToolsCapture.AttachAsync(pane.View.CoreWebView2);
                        if (_isClosing || !IsCurrentPane(pane)) return null;
                    }
                    if (_huntAnalyzerScript == null) _huntAnalyzerScript = LoadHuntAnalyzerScript();
                    if (_betterUiScript == null) _betterUiScript = LoadBetterUiScript();
                    await RegisterHuntAnalyzerAsync(pane.View, _huntAnalyzerScript);
                    if (_isClosing || !IsCurrentPane(pane)) return null;
                    await RegisterBetterUiAsync(pane.View, _betterUiScript);
                    if (_isClosing || !IsCurrentPane(pane)) return null;
                    NavigateHome(pane.View);
                }

                return pane;
            }
            catch
            {
                if (_isClosing) return null;
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
            finally
            {
                if (_perfMetrics != null)
                    _perfMetrics.Observe(WorkspacePerfSpan.PaneSetup, perfStarted);
            }
        }

        private async Task InitializeAsync()
        {
            try
            {
                _split.Panel1MinSize = DpiMetric(320);
                _split.Panel2MinSize = DpiMetric(320);
                RefreshHealthLabelsForLayout(IsExpandedDeck());

                if (_workspaceState.Mode == WorkspaceMode.Single)
                {
                    _split.Panel2Collapsed = true;
                    await EnsurePaneAsync(
                        _workspaceState.SingleProfileId,
                        _leftHost,
                        _leftStatus
                    );
                    if (_isClosing) return;
                    ApplyHealthToLabel(
                        _rightStatus,
                        ProfileRegistry.Get(_workspaceState.RightProfileId).DisplayName,
                        PaneHealthState.Idle,
                        "Idle",
                        IsExpandedDeck()
                    );
                }
                else
                {
                    _split.Panel2Collapsed = false;
                    await EnsurePaneAsync(
                        _workspaceState.LeftProfileId,
                        _leftHost,
                        _leftStatus
                    );
                    if (_isClosing) return;
                    await EnsurePaneAsync(
                        _workspaceState.RightProfileId,
                        _rightHost,
                        _rightStatus
                    );
                    if (_isClosing) return;
                }

                if (_isClosing) return;
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
                    if (_shutdownDuringInitSmoke) return;
                    if (_shutdownDuringSwitchSmoke)
                    {
                        await RunShutdownDuringSwitchSmokeAsync();
                        return;
                    }
                    if (IsShutdownSaveSmoke)
                    {
                        _smokeTimer.Start();
                        await RunSyntheticShutdownSaveSmokeAsync();
                        return;
                    }
                    if (_perfVisibleFocusSmoke)
                    {
                        _smokeTimer.Start();
                        await PrepareVisualSmokePagesAsync();
                        return;
                    }
                    if (_perfIdlePreflightSmoke)
                    {
                        _smokeTimer.Start();
                        await RunIdlePreflightSmokeAsync();
                        return;
                    }
                    if (_perfIdleSmoke)
                    {
                        await RunIdlePerfSmokeAsync();
                        return;
                    }
                    _smokeTimer.Start();
                    await RunSmokeAsync();
                    return;
                }

                if (_isClosing) return;
                _commandDeck.Enabled = true;
                if (_workspaceState.MaintenanceDrawerExpanded)
                    BeginInvoke(new Action(ToggleMaintenanceDrawer));
            }
            catch (Exception ex)
            {
                if (_isClosing) return;
                ApplyHealthToLabel(
                    _leftStatus,
                    ProfileRegistry.Get(_workspaceState.LeftProfileId).DisplayName,
                    PaneHealthState.Error,
                    "Initialization error",
                    IsExpandedDeck()
                );
                ApplyHealthToLabel(
                    _rightStatus,
                    ProfileRegistry.Get(_workspaceState.RightProfileId).DisplayName,
                    PaneHealthState.Error,
                    "Initialization error",
                    IsExpandedDeck()
                );
                Console.Error.WriteLine(ex);
                if (_smokeMode)
                {
                    Environment.ExitCode = IsShutdownSaveSmoke ? 4 : 1;
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
            if (_isClosing || action == null) return;
            await _workspaceMutationGate.WaitAsync();
            try
            {
                if (_isClosing) return;
                await action();
            }
            catch (Exception ex)
            {
                if (_isClosing) return;
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
            if (_isClosing) return;
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
            ApplyHealthToLabel(
                _rightStatus,
                ProfileRegistry.Get(_workspaceState.RightProfileId).DisplayName,
                PaneHealthState.Idle,
                "Idle",
                IsExpandedDeck()
            );

            await EnsurePaneAsync(selectedProfile.Id, _leftHost, _leftStatus);
            if (_isClosing) return;
            if (!_smokeMode) PersistWorkspaceState();
            UpdateCommandDeck();
        }

        private async Task SwitchSingleProfileAsync(string profileId)
        {
            if (_isClosing) return;
            if (_workspaceState.Mode != WorkspaceMode.Single)
                throw new InvalidOperationException("Single-profile switching requires Single mode.");

            if (string.Equals(_workspaceState.SingleProfileId, profileId, StringComparison.OrdinalIgnoreCase))
                return;

            await SwitchToSingleAsync(profileId);
        }

        private async Task SwitchToDualAsync()
        {
            if (_isClosing) return;
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
            if (_isClosing) return;
            await EnsurePaneAsync(_workspaceState.RightProfileId, _rightHost, _rightStatus);
            if (_isClosing) return;
            SetSplitRatio(_workspaceState.LastDualRatio);

            if (!_smokeMode) PersistWorkspaceState();
            UpdateCommandDeck();
        }

        private async Task RunShutdownDuringSwitchSmokeAsync()
        {
            await SwitchToSingleAsync(_workspaceState.RightProfileId);
            if (_isClosing)
                throw new InvalidOperationException("Switch shutdown smoke closed before probe arm.");

            _shutdownSwitchProbeArmed = true;
            await SwitchToDualAsync();
            if (!_isClosing)
                throw new InvalidOperationException("Switch shutdown smoke did not begin shutdown.");
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
                if (Math.Abs(released - target) <= DpiMetric(24))
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

        private void PersistWorkspaceState(bool allowDuringClosing = false)
        {
            if (!_settingsWriteAllowed
                || (_smokeMode && !_smokeFocusSaveProbe && !IsShutdownSaveSmoke)
                || (_isClosing && !allowDuringClosing)) return;

            if (_workspaceState.Mode == WorkspaceMode.Dual && !_split.Panel2Collapsed)
            {
                var ratio = GetCurrentSplitRatio();
                _workspaceState.LayoutRatio = ratio;
                if (!_workspaceState.FocusMode) _workspaceState.LastDualRatio = ratio;
            }

            var store = _smokeFocusSaveProbe ? _smokeFocusSaveStore : _settingsStore;
            var fingerprint = store.NormalizedFingerprint(_workspaceState);
            if (string.Equals(fingerprint, _lastSavedSettingsFingerprint, StringComparison.Ordinal))
                return;

            var perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
            try
            {
                if (_smokeFocusSaveProbe) _smokeFocusSaveCalls++;
                store.Save(_workspaceState);
                _lastSavedSettingsFingerprint = fingerprint;
            }
            catch (WorkspaceSettingsConflictException)
            {
                if (_perfMetrics != null)
                    _perfMetrics.Count(WorkspacePerfCounter.SettingsSaveFailed);
                if (_smokeMode || _isClosing) throw;
                _settingsWriteAllowed = false;
                try { WarnAboutConcurrentWorkspaceSettings(this); }
                catch (Exception warningError)
                {
                    Console.Error.WriteLine("Workspace settings conflict warning failed: "
                        + warningError.GetType().Name);
                }
            }
            catch (IOException)
            {
                if (_perfMetrics != null)
                    _perfMetrics.Count(WorkspacePerfCounter.SettingsSaveFailed);
                if (_smokeMode || _isClosing) throw;
                DisableWorkspaceSettingsWritesAfterSaveError();
            }
            catch (UnauthorizedAccessException)
            {
                if (_perfMetrics != null)
                    _perfMetrics.Count(WorkspacePerfCounter.SettingsSaveFailed);
                if (_smokeMode || _isClosing) throw;
                DisableWorkspaceSettingsWritesAfterSaveError();
            }
            catch
            {
                if (_perfMetrics != null)
                    _perfMetrics.Count(WorkspacePerfCounter.SettingsSaveFailed);
                throw;
            }
            finally
            {
                if (_perfMetrics != null)
                    _perfMetrics.Observe(WorkspacePerfSpan.SettingsSave, perfStarted);
            }
        }

        private void DisableWorkspaceSettingsWritesAfterSaveError()
        {
            _settingsWriteAllowed = false;
            try { WarnAboutDisabledWorkspaceSettings(this); }
            catch (Exception warningError)
            {
                Console.Error.WriteLine("Workspace settings save warning failed: "
                    + warningError.GetType().Name);
            }
        }

        private async Task RunSyntheticShutdownSaveSmokeAsync()
        {
            // This is the only path which arms the shutdown-only store hook.
            // Existing baseline/visual smokes and the normal host never enter it.
            if (!_smokeMode || !IsShutdownSaveSmoke || _isClosing)
                throw new InvalidOperationException("Shutdown fixture requires an active synthetic host.");

            var left = GetPaneForProfile(ProfileRegistry.Rhyxus.Id);
            var right = GetPaneForProfile(ProfileRegistry.Rhyosa.Id);
            if (_panesByProfile.Count != 2 || left == null || right == null
                || object.ReferenceEquals(left, right) || !left.IsInitialized || !right.IsInitialized
                || left.View == null || right.View == null
                || _gameDockOverflowMenu == null || _gameDockOverflowMenu.IsDisposed
                || _smokeTimer == null || !_smokeTimer.Enabled || _toolTip == null
                || _shutdownSmokeMenuDisposed || _shutdownSmokeTimerDisposed
                || _shutdownSmokeToolTipDisposed)
                throw new InvalidOperationException("Shutdown fixture needs two real WebView2 panes and WinForms resources.");

            // Actual WebView2 navigation, but only to two minimal file:// pages.
            var directory = Path.Combine(_baseDir, "smoke", "shutdown-save-" + ShutdownSaveSmokeLabel);
            Directory.CreateDirectory(directory);
            var leftPath = Path.Combine(directory, "left.html");
            var rightPath = Path.Combine(directory, "right.html");
            File.WriteAllText(leftPath, "<!doctype html><title>Local shutdown fixture left</title><body>left</body>");
            File.WriteAllText(rightPath, "<!doctype html><title>Local shutdown fixture right</title><body>right</body>");
            await Task.WhenAll(
                NavigateSmokePaneAsync(left, new Uri(leftPath).AbsoluteUri),
                NavigateSmokePaneAsync(right, new Uri(rightPath).AbsoluteUri)
            );
            if (_isClosing || !IsCurrentPane(left) || !IsCurrentPane(right)
                || left.View.CoreWebView2.Source == null || right.View.CoreWebView2.Source == null
                || !new Uri(left.View.CoreWebView2.Source).IsFile
                || !new Uri(right.View.CoreWebView2.Source).IsFile)
                throw new InvalidOperationException("Shutdown fixture did not finish both local HTML navigations.");

            // Seed an existing valid destination while injection is disarmed;
            // Replace therefore enters File.Replace rather than File.Move.
            _settingsStore.Save(_workspaceState);
            _lastSavedSettingsFingerprint = _settingsStore.NormalizedFingerprint(_workspaceState);
            _shutdownSmokeOriginalFingerprint = _lastSavedSettingsFingerprint;
            _shutdownSmokeOriginalSettings = File.ReadAllBytes(_shutdownSmokeSettingsPath);
            if (_shutdownSmokeOriginalSettings.Length == 0
                || File.Exists(_shutdownSmokeSettingsPath + ".tmp"))
                throw new InvalidOperationException("Shutdown fixture did not seed an intact settings destination.");

            _workspaceState.CommandScope = _workspaceState.CommandScope == CommandScope.Both
                ? CommandScope.Active : CommandScope.Both;
            if (_shutdownSaveSuccessSmoke)
            {
                SetSplitRatio(0.66);
                _shutdownSmokeExpectedRatio = GetCurrentSplitRatio();
                if (Math.Abs(_shutdownSmokeExpectedRatio - 0.5) < 0.05)
                    throw new InvalidOperationException("Shutdown fixture did not change the actual split geometry.");
                // The final Save must read the live splitter, not just serialize
                // values that SetSplitRatio already copied into the model.
                _workspaceState.LayoutRatio = 0.34;
                _workspaceState.LastDualRatio = 0.34;
                _workspaceState.ActiveProfileId = ProfileRegistry.Rhyosa.Id;
                _workspaceState.CardsViewByProfile[ProfileRegistry.Rhyxus.Id] = false;
                _workspaceState.ZoomByProfile[ProfileRegistry.Rhyosa.Id] = 1.25;
            }
            if (string.Equals(_settingsStore.NormalizedFingerprint(_workspaceState),
                _shutdownSmokeOriginalFingerprint, StringComparison.Ordinal))
                throw new InvalidOperationException("Shutdown fixture did not create a dirty state.");

            _shutdownSmokePanes = new[] { left, right };
            _shutdownSmokeFixtureReady = true;
            _shutdownSmokeFaultArmed = !_shutdownSaveSuccessSmoke;
            Environment.ExitCode = 4; // Default FAIL; actual shutdown verifier alone sets 1.
            Close(); // Real FormClosing -> FormClosed -> CompleteShutdown on the UI thread.
            if (!_shutdownCleanupCompleted)
            {
                Console.Error.WriteLine("CW-PERF-005 shutdown fixture FAIL: real FormClosed cleanup never ran.");
                Environment.ExitCode = 4;
            }
        }

        private async Task RunIdlePerfSmokeAsync()
        {
            await PrepareVisualSmokePagesAsync();
            var left = GetPaneForSide(PaneSide.Left);
            var right = GetPaneForSide(PaneSide.Right);
            if (left == null || right == null || !left.WorkspaceBridgeReady || !right.WorkspaceBridgeReady)
                throw new InvalidOperationException("Idle performance smoke requires both visual fixture bridges to be ready.");
            SetContentView(left.Profile.Id, !_perfIdleGame);
            SetContentView(right.Profile.Id, !_perfIdleGame && !_perfIdleMixed);
            foreach (var pane in new[] { left, right })
            {
                var expectedVisible = !_perfIdleGame
                    && (!_perfIdleMixed || object.ReferenceEquals(pane, left));
                await VerifyIdleFixtureViewAsync(pane, expectedVisible);
            }
            var idleReadyMarker = Path.Combine(_baseDir, "smoke", "perf-idle-ready.txt");
            var idleClock = System.Diagnostics.Stopwatch.StartNew();
            File.WriteAllText(
                idleReadyMarker,
                DateTime.UtcNow.ToString("o") + Environment.NewLine
            );
            Console.WriteLine(
                _perfIdleMixed
                    ? "CW-PERF-001 synthetic idle mixed cards/game: READY"
                    : _perfIdleGame
                        ? "CW-PERF-001 synthetic idle game: READY"
                        : "CW-PERF-001 synthetic idle cards: READY"
            );
            await Task.Delay(TimeSpan.FromMinutes(10));
            idleClock.Stop();
            var idlePassMarker = Path.Combine(_baseDir, "smoke", "perf-idle-pass.txt");
            File.WriteAllText(
                idlePassMarker,
                DateTime.UtcNow.ToString("o") + Environment.NewLine
                + idleClock.Elapsed.TotalMilliseconds.ToString("F3", System.Globalization.CultureInfo.InvariantCulture)
                + Environment.NewLine
            );
            Console.WriteLine(
                _perfIdleMixed
                    ? "CW-PERF-001 synthetic idle mixed cards/game: PASS"
                    : _perfIdleGame
                        ? "CW-PERF-001 synthetic idle game: PASS"
                        : "CW-PERF-001 synthetic idle cards: PASS"
            );
            Environment.ExitCode = 0;
            Close();
        }

        private static async Task VerifyIdleFixtureViewAsync(AccountPane pane, bool expectedCards)
        {
            if (pane == null || pane.View == null || pane.View.CoreWebView2 == null)
                throw new InvalidOperationException("Idle performance smoke has no current fixture WebView2.");
            // A missing dashboard root is NOT proof of a Game view. Require
            // explicit root existence and the actual hidden state for each.
            var expectedState = expectedCards ? "\"cards\"" : "\"game\"";
            string observedState = null;
            for (var attempt = 0; attempt < 20; attempt++)
            {
                observedState = await pane.View.CoreWebView2.ExecuteScriptAsync(
                    "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                    + "return !root?'missing':root.hidden?'game':'cards';})()"
                );
                if (string.Equals(observedState, expectedState, StringComparison.Ordinal)) return;
                await Task.Delay(100);
            }
            throw new InvalidOperationException(
                "Idle performance smoke fixture root/mode did not settle: expected="
                + expectedState + ", actual=" + (observedState ?? "null") + "."
            );
        }

        private async Task RunIdlePreflightSmokeAsync()
        {
            if (!_smokeMode || !_perfIdlePreflightSmoke)
                throw new InvalidOperationException("Idle preflight must run only as an explicit local smoke.");
            await PrepareVisualSmokePagesAsync();
            var left = GetPaneForSide(PaneSide.Left);
            var right = GetPaneForSide(PaneSide.Right);
            if (left == null || right == null || !left.WorkspaceBridgeReady || !right.WorkspaceBridgeReady)
                throw new InvalidOperationException("Idle preflight requires both local HTML fixture bridges.");

            SetContentView(left.Profile.Id, true);
            SetContentView(right.Profile.Id, true);
            await VerifyIdleFixtureViewAsync(left, true);
            await VerifyIdleFixtureViewAsync(right, true);

            SetContentView(left.Profile.Id, false);
            SetContentView(right.Profile.Id, false);
            await VerifyIdleFixtureViewAsync(left, false);
            await VerifyIdleFixtureViewAsync(right, false);

            SetContentView(left.Profile.Id, true);
            await VerifyIdleFixtureViewAsync(left, true);
            await VerifyIdleFixtureViewAsync(right, false);

            var deleted = await right.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                + "if(!root)return false;root.remove();return true;})()"
            );
            if (!string.Equals(deleted, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("Idle missing-root negative could not remove local fixture root.");
            var missingRejected = false;
            try
            {
                await VerifyIdleFixtureViewAsync(right, false);
            }
            catch (InvalidOperationException ex)
            {
                missingRejected = ex.Message.IndexOf("actual=\"missing\"", StringComparison.Ordinal) >= 0;
                if (!missingRejected) throw;
            }
            if (!missingRejected)
                throw new InvalidOperationException("Game preflight incorrectly accepted an absent root.");

            _smokeTimer.Stop();
            Console.WriteLine("CW-PERF-001 idle preflight: cards/cards + game/game + mixed + missing-root refusal PASS (600s idle NOT RUN)");
            Environment.ExitCode = 0;
            Close();
        }

        private async Task RunVisibleSyntheticFocusSmokeAsync()
        {
            if (!_smokeMode || !_perfVisibleFocusSmoke || _perfMetrics == null || _isClosing)
                throw new InvalidOperationException("Visible synthetic focus requires opt-in metrics and a live local fixture.");
            var left = GetPaneForSide(PaneSide.Left);
            var right = GetPaneForSide(PaneSide.Right);
            if (left == null || right == null || !left.WorkspaceBridgeReady || !right.WorkspaceBridgeReady)
                throw new InvalidOperationException("Visible synthetic focus requires two ready local HTML fixture panes.");
            if (_workspaceState.Mode != WorkspaceMode.Dual || _workspaceState.FocusMode)
                throw new InvalidOperationException("Visible synthetic focus requires restored Dual layout.");

            SetContentView(left.Profile.Id, false);
            SetContentView(right.Profile.Id, false);
            _commandDeck.Enabled = true;
            Activate();
            await Task.Delay(150);
            if (!Visible || Opacity <= 0 || !ContainsFocus)
                throw new InvalidOperationException("The visible local fixture did not obtain actual OS focus; no synthetic event will be counted.");

            var initiallyReceived = _perfFocusReceived;
            var initiallyCompleted = _perfFocusCompleted;
            for (var cycle = 1; cycle <= 20; cycle++)
            {
                var target = cycle % 2 == 1 ? left : right;
                if (_isClosing || !IsCurrentPane(target) || target.View == null || !target.View.Visible)
                    throw new InvalidOperationException("Local WebView2 pane unavailable during real focus transition.");
                if (!_maintenanceButton.Focus())
                    throw new InvalidOperationException("Real WinForms blur control failed to receive focus.");
                await Task.Delay(45);
                if (!_maintenanceButton.Focused)
                    throw new InvalidOperationException("Host blur control was not actually focused.");
                if (_webViewFocusedProfileId != null)
                    throw new InvalidOperationException("Host blur did not release the previous WebView2 focus owner.");
                _perfFocusRequestedCycle = cycle;
                var accepted = target.View.Focus();
                var settled = false;
                for (var attempt = 0; attempt < 40; attempt++)
                {
                    await Task.Delay(35);
                    if (_perfFocusLastCompletedCycle == cycle
                        && _perfFocusCompleted - initiallyCompleted == cycle
                        && _perfFocusReceived - initiallyReceived == cycle
                        && string.Equals(_perfFocusLastCompletedProfile, target.Profile.Id, StringComparison.OrdinalIgnoreCase)
                        && target.View.ContainsFocus && ContainsFocus
                        && string.Equals(_webViewFocusedProfileId, target.Profile.Id, StringComparison.OrdinalIgnoreCase)
                        && string.Equals(_workspaceState.ActiveProfileId, target.Profile.Id, StringComparison.OrdinalIgnoreCase))
                    {
                        settled = true;
                        break;
                    }
                }
                if (!settled)
                    throw new InvalidOperationException(
                        "Real visible WebView2 focus cycle " + cycle
                        + " not processed/stable: accepted=" + accepted
                        + " receivedDelta=" + (_perfFocusReceived - initiallyReceived)
                        + " completedDelta=" + (_perfFocusCompleted - initiallyCompleted)
                        + " completedCycle=" + _perfFocusLastCompletedCycle
                        + " viewCanFocus=" + target.View.CanFocus
                        + " viewFocused=" + target.View.Focused
                        + " containsFocus=" + target.View.ContainsFocus
                        + " formContainsFocus=" + ContainsFocus
                        + " owner=" + (_webViewFocusedProfileId ?? "none")
                        + " active=" + (_workspaceState.ActiveProfileId ?? "none") + "."
                    );
                Console.WriteLine("CW-PERF-001 visible focus cycle " + cycle + "/20: actual event and owner PASS");
            }
            if (_perfFocusReceived - initiallyReceived != 20
                || _perfFocusCompleted - initiallyCompleted != 20)
                throw new InvalidOperationException("Visible focus event totals were not exactly 20/20.");

            // Distinguish blur *out of the host window* from the legitimate
            // wrapper->Chromium child transition. This is another local
            // WinForms fixture, not a user browser or an external process.
            using (var otherForm = new Form())
            {
                otherForm.Text = "CW-PERF-001 LOCAL EXTERNAL BLUR";
                otherForm.ShowInTaskbar = false;
                otherForm.Width = 260;
                otherForm.Height = 130;
                var otherButton = new Button { Text = "Local focus target", Dock = DockStyle.Fill };
                otherForm.Controls.Add(otherButton);
                otherForm.Show();
                otherForm.Activate();
                otherButton.Focus();
                await Task.Delay(120);
                if (!otherButton.Focused)
                    throw new InvalidOperationException("Auxiliary local form did not receive actual focus.");
                if (_webViewFocusedProfileId != null)
                    throw new InvalidOperationException("Host retained WebView2 focus ownership after deactivation to auxiliary local form.");
                otherForm.Close();
            }
            // Reacquire focus directly on the host control. Calling Activate
            // here can generate an unrelated extra WebView2 GotFocus sample
            // before the explicit final host-blur assertion.
            if (!_maintenanceButton.Focus())
                throw new InvalidOperationException("Final host blur request was rejected.");
            await Task.Delay(45);
            if (!_maintenanceButton.Focused || _webViewFocusedProfileId != null)
                throw new InvalidOperationException("Final blur did not return focus ownership to the host.");

            // Deterministic *real event* race: a GotFocus callback can enter
            // while an unrelated workspace mutation owns the async gate.
            // Blur to the toolbar before releasing that gate and prove that
            // the queued event cannot resurrect an obsolete focus owner or
            // change the active account. No synthetic event is invoked.
            _perfFocusRequestedCycle = 0;
            right.View.Focus();
            var restored = false;
            for (var attempt = 0; attempt < 40; attempt++)
            {
                await Task.Delay(35);
                if (right.View.ContainsFocus && ContainsFocus
                    && string.Equals(_webViewFocusedProfileId, right.Profile.Id, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(_workspaceState.ActiveProfileId, right.Profile.Id, StringComparison.OrdinalIgnoreCase))
                {
                    restored = true;
                    break;
                }
            }
            if (!restored)
                throw new InvalidOperationException("Gated focus race cannot restore the right local pane as the initial owner.");

            var receivedBeforeRace = _perfFocusReceived;
            var completedBeforeRace = _perfFocusCompleted;
            var capturedLeftFocusEvent = false;
            var released = false;
            await _workspaceMutationGate.WaitAsync();
            try
            {
                _perfFocusRequestedCycle = 21;
                left.View.Focus();
                for (var attempt = 0; attempt < 40; attempt++)
                {
                    await Task.Delay(35);
                    if (_perfFocusReceived == receivedBeforeRace + 1
                        && _perfFocusCompleted == completedBeforeRace
                        && left.View.ContainsFocus && ContainsFocus)
                    {
                        capturedLeftFocusEvent = true;
                        break;
                    }
                }
                if (!capturedLeftFocusEvent)
                    throw new InvalidOperationException("Gated focus regression did not observe an actual queued WinForms GotFocus.");
                if (!_maintenanceButton.Focus())
                    throw new InvalidOperationException("Gated focus regression failed to blur to toolbar.");
                await Task.Delay(55);
                if (!_maintenanceButton.Focused || !ContainsFocus || left.View.ContainsFocus
                    || _webViewFocusedProfileId != null
                    || !string.Equals(_workspaceState.ActiveProfileId, right.Profile.Id, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("Gated focus regression did not establish real toolbar blur before gate release.");
            }
            finally
            {
                _workspaceMutationGate.Release();
                released = true;
            }
            if (!released)
                throw new InvalidOperationException("Gated focus regression failed to release the mutation semaphore.");
            var completedStaleFocus = false;
            for (var attempt = 0; attempt < 40; attempt++)
            {
                await Task.Delay(35);
                if (_perfFocusCompleted == completedBeforeRace + 1
                    && _perfFocusLastCompletedCycle == 21
                    && string.Equals(_perfFocusLastCompletedProfile, left.Profile.Id, StringComparison.OrdinalIgnoreCase))
                {
                    completedStaleFocus = true;
                    break;
                }
            }
            if (!completedStaleFocus || !_maintenanceButton.Focused || !ContainsFocus
                || left.View.ContainsFocus || _webViewFocusedProfileId != null
                || !string.Equals(_workspaceState.ActiveProfileId, right.Profile.Id, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    "Gated stale GotFocus was processed after toolbar blur: callbackComplete="
                    + completedStaleFocus + ", owner=" + (_webViewFocusedProfileId ?? "none")
                    + ", active=" + (_workspaceState.ActiveProfileId ?? "none")
                    + ", toolbarFocused=" + _maintenanceButton.Focused + "."
                );
            Console.WriteLine("CW-PERF-001 gated stale GotFocus: suppressed owner and active-profile mutation PASS");
        }

        private void ConfigureView(AccountPane pane)
        {
            var view = pane.View;
            var profileId = pane.Profile.Id;
            var profileName = pane.Profile.DisplayName;
            var core = view.CoreWebView2;
            view.GotFocus += async delegate
            {
                if (_isClosing) return;
                var requestedFocusCycle = _perfVisibleFocusSmoke ? _perfFocusRequestedCycle : 0;
                if (requestedFocusCycle > 0) _perfFocusReceived++;
                if (_perfVisibleFocusSmoke)
                    Console.WriteLine("CW-PERF-001 focus trace GOT profile=" + profileId
                        + " cycle=" + requestedFocusCycle
                        + " viewFocused=" + view.Focused
                        + " containsFocus=" + view.ContainsFocus
                        + " owner=" + (_webViewFocusedProfileId ?? "none"));
                var perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
                if (_perfMetrics != null)
                    _perfMetrics.Count(WorkspacePerfCounter.FocusReceived);
                try
                {
                    await RunWorkspaceMutationAsync(delegate
                    {
                        // GotFocus is async: another workspace mutation can
                        // hold the semaphore while the user focuses a toolbar
                        // button or switches windows. Recheck the *actual*
                        // pane/host focus after acquiring the gate so a stale
                        // callback cannot resurrect the owner or persist a
                        // now-inactive account. ContainsFocus, not Focused,
                        // also recognizes the native Chromium child.
                        if (IsCurrentPane(pane) && view.ContainsFocus && ContainsFocus)
                        {
                            _webViewFocusedProfileId = profileId;
                            SetActiveProfile(profileId);
                        }
                        return Task.FromResult(0);
                    });
                }
                finally
                {
                    if (_perfMetrics != null)
                        _perfMetrics.Observe(WorkspacePerfSpan.FocusHandling, perfStarted);
                    if (_perfVisibleFocusSmoke && requestedFocusCycle > 0)
                    {
                        _perfFocusLastCompletedCycle = requestedFocusCycle;
                        _perfFocusLastCompletedProfile = profileId;
                        _perfFocusCompleted++;
                        Console.WriteLine("CW-PERF-001 focus trace COMPLETE profile=" + profileId
                            + " cycle=" + requestedFocusCycle
                            + " viewFocused=" + view.Focused
                            + " containsFocus=" + view.ContainsFocus
                            + " owner=" + (_webViewFocusedProfileId ?? "none"));
                    }
                }
            };
            view.LostFocus += delegate
            {
                if (_isClosing) return;
                if (_perfVisibleFocusSmoke)
                    Console.WriteLine("CW-PERF-001 focus trace LOST profile=" + profileId
                        + " viewFocused=" + view.Focused
                        + " containsFocus=" + view.ContainsFocus
                        + " owner=" + (_webViewFocusedProfileId ?? "none"));
                // WebView2's native browser child can receive focus after
                // the WinForms wrapper raises LostFocus. This is not a blur
                // from the pane while the child still owns actual focus.
                if (view.ContainsFocus) return;
                if (string.Equals(
                    _webViewFocusedProfileId,
                    profileId,
                    StringComparison.OrdinalIgnoreCase
                ))
                {
                    _webViewFocusedProfileId = null;
                    if (!IsDisposed) UpdateCommandDeck();
                }
            };
            core.Settings.AreDevToolsEnabled = true;
            core.Settings.AreDefaultContextMenusEnabled = true;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = true;

            core.WebMessageReceived += delegate(object sender, CoreWebView2WebMessageReceivedEventArgs args)
            {
                if (_isClosing) return;
                if (!IsCurrentBridgeMessageSource(pane, args.Source)) return;
                HandleWorkspaceBridgeMessage(pane, args.WebMessageAsJson);
            };

            core.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs args)
            {
                if (_isClosing) return;
                if (!IsCurrentPane(pane)) return;
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

                // NavigationStarting can repeat for redirects with the SAME
                // NavigationId. Keep the original pre-navigation checkpoint
                // until that navigation commits, fails or gets superseded.
                var samePendingNavigation = !pane.ViewDocumentCommitted
                    && pane.ActiveNavigationId == args.NavigationId;
                if (!samePendingNavigation)
                {
                    pane.BeginViewDocument();
                    RecordPendingWorkspaceRequests();
                    if (string.Equals(
                        pane.Profile.Id,
                        _workspaceState.ActiveProfileId,
                        StringComparison.OrdinalIgnoreCase
                    )) UpdateGameDock();
                }
                pane.ActiveNavigationId = args.NavigationId;
                pane.CurrentUrl = args.Uri;

                if (_smokeMode && object.ReferenceEquals(_smokeCancelNextNavigationPane, pane))
                {
                    _smokeCancelNextNavigationPane = null;
                    args.Cancel = true; // Only an opt-in file:// smoke can reach this branch.
                }

                if (_perfMetrics != null)
                {
                    pane.PerfNavigationId = args.NavigationId;
                    pane.PerfNavigationStartedAt = _perfMetrics.Start();
                    pane.PerfNavigationUiReadyObserved = false;
                    _perfMetrics.Count(WorkspacePerfCounter.NavigationStarted);
                }
                SetPaneHealth(pane, PaneHealthState.Loading, "Loading");
            };

            core.ContentLoading += delegate(object sender, CoreWebView2ContentLoadingEventArgs args)
            {
                if (!_isClosing && IsCurrentPane(pane)
                    && args.NavigationId == pane.ActiveNavigationId)
                    pane.ViewReplacementContentStarted = true;
            };
            core.SourceChanged += delegate(object sender, CoreWebView2SourceChangedEventArgs args)
            {
                if (!_isClosing && IsCurrentPane(pane) && args.IsNewDocument)
                    pane.ViewReplacementContentStarted = true;
            };

            core.NavigationCompleted += async delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
            {
                if (_isClosing) return;
                if (!IsCurrentPane(pane) || args.NavigationId != pane.ActiveNavigationId) return;
                if (_perfMetrics != null && pane.PerfNavigationId == args.NavigationId)
                {
                    _perfMetrics.Observe(WorkspacePerfSpan.NavigationComplete, pane.PerfNavigationStartedAt);
                    _perfMetrics.Count(args.IsSuccess
                        ? WorkspacePerfCounter.NavigationSucceeded
                        : WorkspacePerfCounter.NavigationFailed);
                }
                pane.CurrentUrl = core.Source;
                if (args.IsSuccess)
                {
                    pane.CommitViewDocument();
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
                    await TryRecoverInterruptedViewDocumentAsync(pane, core, args.NavigationId);
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
                if (_isClosing) return;
                if (!IsCurrentPane(pane)) return;
                pane.BeginViewDocument();
                RecordPendingWorkspaceRequests();
                if (_perfMetrics != null)
                    _perfMetrics.Count(WorkspacePerfCounter.ProcessFailed);
                UpdateGameDock();
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
                if (!_isClosing
                    && IsCurrentPane(pane)
                    && navigationId == pane.ActiveNavigationId
                    && string.Equals(ready, "true", StringComparison.Ordinal))
                {
                    if (_perfMetrics != null && pane.PerfNavigationId == navigationId
                        && !pane.PerfNavigationUiReadyObserved)
                    {
                        pane.PerfNavigationUiReadyObserved = true;
                        _perfMetrics.Observe(WorkspacePerfSpan.NavigationUiReadyProbe,
                            pane.PerfNavigationStartedAt);
                        _perfMetrics.Count(WorkspacePerfCounter.UiReadyConfirmed);
                    }
                    SetPaneHealth(pane, PaneHealthState.UiReady, "UI READY");
                }
            }
            catch (Exception ex)
            {
                if (!_isClosing
                    && IsCurrentPane(pane)
                    && navigationId == pane.ActiveNavigationId)
                    pane.LastErrorText = "Better UI health probe failed: " + ex.GetType().Name;
            }
        }

        private async Task RegisterBetterUiAsync(WebView2 view, string script)
        {
            var guarded = BuildDocumentIdleScript(
                BuildCoupledWorkspaceBootstrapStatement() + script,
                TargetOrigin,
                "__PPBUI_WEBVIEW2_INJECTED__",
                "__PPBUI_WEBVIEW2_READY__"
            );
            var perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
            try
            {
                await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(guarded);
            }
            finally
            {
                if (_perfMetrics != null)
                    _perfMetrics.Observe(WorkspacePerfSpan.RegisterBetterUiScript, perfStarted);
            }
        }

        private async Task RegisterHuntAnalyzerAsync(WebView2 view, string script)
        {
            var guarded = BuildDocumentStartScript(
                BuildHuntAnalyzerEmbedBootstrapStatement() + script,
                TargetOrigin,
                "__PPBUI_HUNT_ANALYZER_EMBED_INJECTED__"
            );
            var perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
            try
            {
                await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(guarded);
            }
            finally
            {
                if (_perfMetrics != null)
                    _perfMetrics.Observe(WorkspacePerfSpan.RegisterAnalyzerScript, perfStarted);
            }
        }

        private async Task RegisterEvidenceProbeAsync(WebView2 view, string script)
        {
            var guarded = BuildDocumentStartScript(
                script,
                TargetOrigin,
                "__PPBUI_EVIDENCE_INJECTED__"
            );
            var perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
            try
            {
                await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(guarded);
            }
            finally
            {
                if (_perfMetrics != null)
                    _perfMetrics.Observe(WorkspacePerfSpan.RegisterEvidenceScript, perfStarted);
            }
        }

        private string BuildCoupledWorkspaceBootstrapStatement()
        {
            return
                "if(!window.__PPBUI_COUPLED_WORKSPACE__){"
                + "Object.defineProperty(window,'__PPBUI_COUPLED_WORKSPACE__',{"
                + "value:Object.freeze({protocol:" + WorkspaceBridgeProtocol.Version
                + ",viewCorrelation:2}),"
                + "configurable:false,enumerable:false,writable:false});"
                + "}\n";
        }

        private static string BuildHuntAnalyzerEmbedBootstrapStatement()
        {
            return
                "if(!window.__POKEPIXEL_HUNT_ANALYZER_EMBED__){"
                + "Object.defineProperty(window,'__POKEPIXEL_HUNT_ANALYZER_EMBED__',{"
                + "value:Object.freeze({protocol:" + WorkspaceBridgeProtocol.Version + "}),"
                + "configurable:false,enumerable:false,writable:false});"
                + "}\n";
        }

        private static string BuildWorkspaceBridgeSmokeScript(string profileId)
        {
            var capabilityRequestId = "caps-" + profileId;
            var helloRequestId = "hello-" + profileId;
            var surfaces = BuildGameDockSmokeSurfaces(profileId);
            return
                "(function(){"
                + "window.__PPBUI_GAME_DOCK_OPENED__='';"
                + "window.__PPBUI_GAME_DOCK_ACCEPTED__=false;"
                + "window.__PPBUI_COUPLED_VIEW__='game';"
                + "window.__PPBUI_COUPLED_VIEW_REVISION__=0;"
                + "var capabilityRequestId=" + QuoteJs(capabilityRequestId) + ";"
                + "var helloRequestId=" + QuoteJs(helloRequestId) + ";"
                + "var sessionId=Array.from(crypto.getRandomValues(new Uint8Array(16)),function(n){return n.toString(16).padStart(2,'0');}).join('');"
                + "var mountOrdinal=1,documentEpoch='',capabilitySeq=0,latestViewRevision=0;"
                + "window.__PPBUI_GAME_DOCK_SESSION__=sessionId;"
                + "Object.defineProperty(document,Symbol.for('ppbui.coupled.document-session-probe'),{configurable:true,value:function(){"
                + "return {type:'ppbui.coupled.document-probe',protocol:1,sessionId:sessionId,documentEpoch:documentEpoch,mountOrdinal:mountOrdinal,documentUrl:document.location.href};}});"
                + "var bridge=window.chrome&&window.chrome.webview;if(!bridge)return;"
                + "bridge.addEventListener('message',function(event){"
                + "var data=event.data;if(typeof data==='string'){try{data=JSON.parse(data);}catch(_){return;}}"
                + "if(!data||data.protocol!==1)return;"
                + "if(data.type==='ppbui.coupled.session-ready'){"
                + "if(data.requestId===helloRequestId&&data.sessionId===sessionId&&data.mountOrdinal===mountOrdinal&&/^[a-f0-9]{32}$/.test(data.documentEpoch)){"
                + "documentEpoch=data.documentEpoch;clearInterval(helloTimer);announce();}return;}"
                + "if(data.type==='ppbui.coupled.capabilities-accepted'){"
                + "if(data.requestId===capabilityRequestId&&data.sessionId===sessionId&&data.documentEpoch===documentEpoch&&data.mountOrdinal===mountOrdinal&&data.capabilitySeq===capabilitySeq)window.__PPBUI_GAME_DOCK_ACCEPTED__=data.ok===true;return;}"
                + "if(data.sessionId!==sessionId||data.documentEpoch!==documentEpoch||data.mountOrdinal!==mountOrdinal||!documentEpoch)return;"
                + "if(data.type==='ppbui.coupled.resync-capabilities'){if(data.capabilitySeq===capabilitySeq)announce();return;}"
                + "if(data.type==='ppbui.coupled.set-view'){"
                + "if(data.capabilitySeq!==capabilitySeq||!Number.isSafeInteger(data.viewRevision)||data.viewRevision<=latestViewRevision)return;"
                + "latestViewRevision=data.viewRevision;window.__PPBUI_COUPLED_VIEW_REVISION__=latestViewRevision;"
                + "window.__PPBUI_COUPLED_VIEW__=data.viewMode==='game'?'game':'cards';return;}"
                + "if(data.type!=='ppbui.coupled.open-surface'||data.capabilitySeq!==capabilitySeq)return;"
                + "window.__PPBUI_GAME_DOCK_OPENED__=data.surfaceId||'';"
                + "bridge.postMessage({type:'ppbui.coupled.open-surface-result',protocol:1,requestId:data.requestId||'',surfaceId:data.surfaceId||'',ok:true,error:'',sessionId:sessionId,documentEpoch:documentEpoch,mountOrdinal:mountOrdinal});"
                + "});"
                + "function announce(){bridge.postMessage({type:'ppbui.coupled.capabilities',protocol:1,requestId:capabilityRequestId,sessionId:sessionId,documentEpoch:documentEpoch,mountOrdinal:mountOrdinal,capabilitySeq:++capabilitySeq,surfaces:"
                + surfaces + "});}"
                + "window.__PPBUI_GAME_DOCK_REANNOUNCE__=announce;"
                + "function hello(){if(documentEpoch)return;bridge.postMessage({type:'ppbui.coupled.session-hello',protocol:1,requestId:helloRequestId,sessionId:sessionId,mountOrdinal:mountOrdinal});}"
                + "var helloTimer=setInterval(hello,125);"
                + "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hello,{once:true});else hello();"
                + "})();";
        }

        private static string BuildGameDockSmokeSurfaces(string profileId)
        {
            var rhyosa = string.Equals(
                profileId,
                ProfileRegistry.Rhyosa.Id,
                StringComparison.OrdinalIgnoreCase
            );
            var entries = new List<string>();
            foreach (var definition in GameDockAllSurfaces)
            {
                var available = !(rhyosa && string.Equals(
                    definition.Key,
                    "inventory",
                    StringComparison.OrdinalIgnoreCase
                ));
                entries.Add(
                    "{id:" + QuoteJs(definition.Key)
                    + ",label:" + QuoteJs(definition.Value)
                    + ",available:" + (available ? "true" : "false") + "}"
                );
            }
            // The page is untrusted input. Keep one synthetic surface in smoke so the host
            // proves that capabilities outside the canonical allowlist are ignored.
            entries.Add("{id:'not-allowed',label:'Not Allowed',available:true}");
            return "[" + string.Join(",", entries.ToArray()) + "]";
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

        private static string BuildDocumentStartScript(
            string script,
            string expectedOrigin,
            string markerName
        )
        {
            var originGuard = expectedOrigin == null
                ? ""
                : "if(location.origin!==" + QuoteJs(expectedOrigin) + ")return;";
            return
                "(function(){"
                + "if(window.top!==window)return;"
                + originGuard
                + "if(window[" + QuoteJs(markerName) + "])return;"
                + "Object.defineProperty(window," + QuoteJs(markerName)
                + ",{value:true,configurable:false});\n"
                + script
                + "\n})();";
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

        private string LoadHuntAnalyzerScript()
        {
            var bundle = Path.GetFullPath(
                Path.Combine(_baseDir, "..", "..", "..", "dist", "pokepixel-hunt-analyzer.embed.js")
            );
            if (!File.Exists(bundle))
            {
                throw new FileNotFoundException(
                    "Hunt Analyzer embed bundle not found. Run Prepare-HuntAnalyzerBundle.ps1 first.",
                    bundle
                );
            }
            return File.ReadAllText(bundle);
        }

        private string LoadEvidenceProbeScript()
        {
            var source = Path.GetFullPath(Path.Combine(
                _baseDir, "..", "..", "..", "tools", "game-evidence",
                "pokepixel-evidence-probe.user.js"
            ));
            if (!File.Exists(source))
                throw new FileNotFoundException("Optional evidence probe not found.", source);
            return File.ReadAllText(source);
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
            RunDpiMetricSmoke();
            var leftPane = GetPaneForSide(PaneSide.Left);
            var rightPane = GetPaneForSide(PaneSide.Right);
            if (leftPane == null || rightPane == null)
                throw new InvalidOperationException("Dual smoke requires both account panes.");

            var betterUi = LoadBetterUiScript();
            if (betterUi.Length < 1024)
                throw new InvalidOperationException("Better UI bundle looks unexpectedly small.");
            var huntAnalyzer = LoadHuntAnalyzerScript();
            if (huntAnalyzer.Length < 1024)
                throw new InvalidOperationException("Hunt Analyzer embed bundle looks unexpectedly small.");

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
            RecordSyntheticSmokeReady(leftPane);
            RecordSyntheticSmokeReady(rightPane);

            await RunGameDockBridgeSmokeAsync(leftPane, rightPane);
            await RunViewCorrelationReplaySmokeAsync(leftPane, rightPane);
            await RunCancelledNavigationSmokeAsync(leftPane);
            await RunViewResyncFailureSmokeAsync(leftPane);
            RunRepeatedFocusSettingsSmoke();

            if (string.Equals(
                leftPane.View.CoreWebView2.Environment.UserDataFolder,
                rightPane.View.CoreWebView2.Environment.UserDataFolder,
                StringComparison.OrdinalIgnoreCase
            ))
            {
                throw new InvalidOperationException("WebView2 user data folders are not isolated.");
            }

            var cycleCount = _perfCyclesSmoke ? 20 : 1;
            for (var cycle = 0; cycle < cycleCount; cycle++)
            {
                var cycleLeft = GetPaneForSide(PaneSide.Left);
                var cycleRight = GetPaneForSide(PaneSide.Right);
                var lifecycleStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
                await RunWorkspaceLifecycleSmokeAsync(cycleLeft, cycleRight);
                if (_perfMetrics != null)
                    _perfMetrics.Observe(WorkspacePerfSpan.SmokeLifecycleCycle, lifecycleStarted);
                var layoutStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
                RunLayoutEngineSmoke();
                if (_perfMetrics != null)
                    _perfMetrics.Observe(WorkspacePerfSpan.SmokeFocusLayoutCycle, layoutStarted);
            }
            // CW-PERF-001 deliberately separates reproducible synthetic core
            // startup/bridge/layout/recovery timings from a separate, fully
            // enforced visual screenshot smoke. This opt-in mode does not
            // claim to pass the visual acceptance tests it omits.
            if (!_perfBaselineSmoke)
            {
                if (_perfExtendedVisualSmoke)
                    Console.WriteLine("CW-PERF-001 extended visual smoke: starting full screenshot assertions");
                await CaptureVisualSmokeAsync();
                if (_perfExtendedVisualSmoke)
                    Console.WriteLine("CW-PERF-001 extended visual smoke: full screenshot assertions PASS");
            }
            await RunHostCommandAndDiagnosticsSmokeAsync();

            _smokeTimer.Stop();
            Console.WriteLine(_perfCyclesSmoke
                ? "CW-PERF-001 synthetic 20-cycle core smoke: PASS (visual smoke NOT RUN)"
                : _perfBaselineSmoke
                    ? "CW-PERF-001 synthetic core-only smoke: PASS (visual smoke NOT RUN)"
                    : "WebView2 coupled workspace smoke: PASS");
            Environment.ExitCode = 0;
            Close();
        }

        private void RecordSyntheticSmokeReady(AccountPane pane)
        {
            if (_perfMetrics == null || pane == null || pane.PerfNavigationStartedAt <= 0
                || pane.PerfNavigationId != pane.ActiveNavigationId
                || pane.PerfNavigationUiReadyObserved) return;
            pane.PerfNavigationUiReadyObserved = true;
            // The smoke probe is intentionally separate from real UI READY:
            // the local fixture does not load or inspect a game session.
            _perfMetrics.Observe(WorkspacePerfSpan.SmokeNavigationUiReadyProbe,
                pane.PerfNavigationStartedAt);
            _perfMetrics.Count(WorkspacePerfCounter.SmokeUiReadyConfirmed);
        }

        private async Task RunViewResyncFailureSmokeAsync(AccountPane pane)
        {
            if (!_smokeMode || pane == null || !pane.StrictViewSession || !pane.WorkspaceBridgeReady)
                throw new InvalidOperationException("View resync failure smoke needs a committed local adapter.");
            // The preceding canceled-navigation recovery may still have a
            // scheduled (now obsolete) retry waiting for its final 750ms tick.
            for (var attempt = 0; attempt < 12 && pane.ViewResyncRetryScheduled; attempt++)
                await Task.Delay(100);
            if (pane.ViewResyncRetryScheduled)
                throw new InvalidOperationException("Previous navigation resync did not settle before fault injection.");
            var epoch = pane.ViewDocumentEpoch;
            var sessionId = pane.ViewSessionId;
            var previousRevision = pane.ViewRevision;
            try
            {
                // The first two native posts throw/fail before delivery;
                // the third must reach the same still-running document.
                pane.PendingWorkspaceRequests["before-resync-failure"] = "inventory";
                pane.ResetWorkspaceBridge();
                _smokeResyncFailuresRemaining = 2;
                _smokeResyncPostCount = 0;
                if (RequestCurrentViewCapabilities(pane))
                    throw new InvalidOperationException("Synthetic resync failures were not exercised.");
                for (var attempt = 0; attempt < 40 && !pane.WorkspaceBridgeReady; attempt++)
                {
                    await Task.Delay(100);
                    Application.DoEvents();
                }
                if (!pane.WorkspaceBridgeReady || _smokeResyncPostCount != 3
                    || pane.ViewRevision <= previousRevision
                    || !string.Equals(pane.ViewDocumentEpoch, epoch, StringComparison.Ordinal)
                    || !string.Equals(pane.ViewSessionId, sessionId, StringComparison.Ordinal)
                    || pane.PendingWorkspaceRequests.ContainsKey("before-resync-failure"))
                    throw new InvalidOperationException("Bounded native post retry failed to rehydrate the current document."
                        + " posts=" + _smokeResyncPostCount
                        + " ready=" + pane.WorkspaceBridgeReady
                        + " scheduled=" + pane.ViewResyncRetryScheduled
                        + " epoch=" + (pane.ViewDocumentEpoch == epoch)
                        + " session=" + (pane.ViewSessionId == sessionId));
                for (var attempt = 0; attempt < 12 && pane.ViewResyncRetryScheduled; attempt++)
                    await Task.Delay(100);
                if (pane.ViewResyncRetryScheduled)
                    throw new InvalidOperationException("Previous resync retry did not settle before the next scenario.");

                // Four consecutive failures exhaust immediate post + 3 retries.
                pane.ResetWorkspaceBridge();
                _smokeResyncFailuresRemaining = 4;
                _smokeResyncPostCount = 0;
                if (RequestCurrentViewCapabilities(pane))
                    throw new InvalidOperationException("Expected first all-failing resync post to fail.");
                for (var attempt = 0; attempt < 42 && pane.ViewResyncRetryScheduled; attempt++)
                {
                    await Task.Delay(100);
                    Application.DoEvents();
                }
                if (pane.WorkspaceBridgeReady || pane.ViewResyncRetryScheduled
                    || _smokeResyncPostCount != 4)
                    throw new InvalidOperationException("All-failed resync did not stop offline after four bounded attempts.");

                // A later explicit healthy retry can recover without a reload.
                _smokeResyncFailuresRemaining = 0;
                if (!RequestCurrentViewCapabilities(pane))
                    throw new InvalidOperationException("Recovered native bridge could not send resync.");
                for (var attempt = 0; attempt < 20 && !pane.WorkspaceBridgeReady; attempt++)
                {
                    await Task.Delay(100);
                    Application.DoEvents();
                }
                if (!pane.WorkspaceBridgeReady || pane.ViewDocumentEpoch != epoch
                    || pane.ViewSessionId != sessionId)
                    throw new InvalidOperationException("Healthy resync did not restore the original document.");
                Console.WriteLine("CW-PERF-002 resync transport failures: PASS (2 failures recovered; 4 failures bounded offline; explicit later recovery)");
            }
            finally { _smokeResyncFailuresRemaining = 0; }
        }

        private async Task RunCancelledNavigationSmokeAsync(AccountPane pane)
        {
            if (!_smokeMode || pane == null || !pane.StrictViewSession || !pane.WorkspaceBridgeReady)
                throw new InvalidOperationException("Canceled navigation smoke needs a committed local document.");
            var core = pane.View.CoreWebView2;
            var priorUrl = core.Source;
            var priorSession = pane.ViewSessionId;
            var priorEpoch = pane.ViewDocumentEpoch;
            var priorRevision = pane.ViewRevision;
            var completion = new TaskCompletionSource<bool>();
            EventHandler<CoreWebView2NavigationCompletedEventArgs> handler = null;
            handler = delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
            {
                core.NavigationCompleted -= handler;
                completion.TrySetResult(args.IsSuccess);
            };
            pane.PendingWorkspaceRequests["cancelled-navigation-open"] = "inventory";
            core.NavigationCompleted += handler;
            try
            {
                _smokeCancelNextNavigationPane = pane;
                core.Navigate(priorUrl);
                if (await Task.WhenAny(completion.Task, Task.Delay(3500)) != completion.Task)
                    throw new InvalidOperationException("Canceled navigation did not emit NavigationCompleted.");
                if (await completion.Task)
                    throw new InvalidOperationException("Synthetic NavigationStarting cancel unexpectedly succeeded.");
            }
            finally
            {
                _smokeCancelNextNavigationPane = null;
                core.NavigationCompleted -= handler;
            }

            var probeScript = "(function(){var p=document[Symbol.for('ppbui.coupled.document-session-probe')];"
                + "return typeof p==='function'?p():null;})()";
            WorkspaceBridgeMessage live = null;
            try { live = WorkspaceBridgeProtocol.Deserialize(await core.ExecuteScriptAsync(probeScript)); }
            catch (Exception) { }
            var oldSurvived = live != null
                && live.Type == "ppbui.coupled.document-probe"
                && string.Equals(live.SessionId, priorSession, StringComparison.Ordinal)
                && string.Equals(live.DocumentEpoch, priorEpoch, StringComparison.Ordinal)
                && SameDocumentAddress(live.DocumentUrl, priorUrl)
                && !pane.ViewReplacementContentStarted;
            if (oldSurvived)
            {
                for (var attempt = 0; attempt < 28 && !pane.WorkspaceBridgeReady; attempt++)
                {
                    await Task.Delay(100);
                    Application.DoEvents();
                }
                if (!pane.WorkspaceBridgeReady || !pane.ViewDocumentCommitted
                    || !pane.StrictViewSession || pane.ViewSessionId != priorSession
                    || pane.ViewDocumentEpoch != priorEpoch || pane.ViewRevision < priorRevision)
                    throw new InvalidOperationException("Verified surviving old document did not recover its bridge.");
            }
            else if (pane.ViewDocumentCommitted || pane.WorkspaceBridgeReady)
                throw new InvalidOperationException("Failed navigation authorized an unverified/error document.");

            if (pane.PendingWorkspaceRequests.ContainsKey("cancelled-navigation-open"))
                throw new InvalidOperationException("Canceled navigation replayed a previously pending native action.");

            if (!oldSurvived)
            {
                // Chromium can replace a canceled/error document. Return this
                // smoke pane to the same local file without assuming survival.
                var loaded = new TaskCompletionSource<bool>();
                EventHandler<CoreWebView2NavigationCompletedEventArgs> restore = null;
                restore = delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
                {
                    core.NavigationCompleted -= restore;
                    loaded.TrySetResult(args.IsSuccess);
                };
                core.NavigationCompleted += restore;
                try
                {
                    core.Navigate(priorUrl);
                    if (await Task.WhenAny(loaded.Task, Task.Delay(3500)) != loaded.Task || !await loaded.Task)
                        throw new InvalidOperationException("Failed navigation smoke could not restore local HTML.");
                    for (var attempt = 0; attempt < 20 && !pane.WorkspaceBridgeReady; attempt++)
                    {
                        await Task.Delay(100);
                        Application.DoEvents();
                    }
                    if (!pane.WorkspaceBridgeReady)
                        throw new InvalidOperationException("Failed navigation smoke did not rehydrate local capabilities.");
                }
                finally { core.NavigationCompleted -= restore; }
            }
            Console.WriteLine("CW-PERF-002 canceled NavigationStarting/failed NavigationCompleted: PASS (oldDocumentSurvived="
                + oldSurvived + "; pending actions cleared; no unverified session accepted)");
        }

        private async Task RunViewCorrelationReplaySmokeAsync(AccountPane pane, AccountPane other)
        {
            if (pane == null || other == null || !pane.StrictViewSession || !other.StrictViewSession)
                throw new InvalidOperationException("Strict view replay smoke requires both correlated local panes.");
            var oldEpoch = pane.ViewDocumentEpoch;
            var oldSession = pane.ViewSessionId;
            var oldMount = pane.ViewMountOrdinal;
            var oldCapabilitySeq = pane.ViewCapabilitySeq;
            var oldRevision = pane.ViewRevision;
            var unaffectedSession = other.ViewSessionId;
            var reloadUrl = pane.View.CoreWebView2.Source;
            pane.PendingWorkspaceRequests["prior-document-open"] = "inventory";
            var complete = new TaskCompletionSource<bool>();
            EventHandler<CoreWebView2NavigationCompletedEventArgs> handler = null;
            handler = delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
            {
                pane.View.CoreWebView2.NavigationCompleted -= handler;
                if (args.IsSuccess) complete.TrySetResult(true);
                else complete.TrySetException(new InvalidOperationException("Same-URL replay smoke reload failed."));
            };
            pane.View.CoreWebView2.NavigationCompleted += handler;
            try
            {
                pane.View.CoreWebView2.Reload();
                await complete.Task;
            }
            finally
            {
                pane.View.CoreWebView2.NavigationCompleted -= handler;
            }

            for (var attempt = 0; attempt < 18 && !pane.WorkspaceBridgeReady; attempt++)
            {
                await Task.Delay(100);
                Application.DoEvents();
            }
            if (!pane.WorkspaceBridgeReady || !pane.StrictViewSession
                || pane.ViewDocumentEpoch == oldEpoch || pane.ViewSessionId == oldSession
                || pane.ViewRevision <= oldRevision
                || !string.Equals(pane.View.CoreWebView2.Source, reloadUrl, StringComparison.OrdinalIgnoreCase)
                || pane.PendingWorkspaceRequests.ContainsKey("prior-document-open")
                || !other.WorkspaceBridgeReady || other.ViewSessionId != unaffectedSession)
                throw new InvalidOperationException("Same-URL reload failed to replace only its document session.");

            var retainedOpenId = "same-session-pending-open";
            pane.PendingWorkspaceRequests[retainedOpenId] = "inventory";
            try
            {
                var beforeReannounce = pane.ViewCapabilitySeq;
                await pane.View.CoreWebView2.ExecuteScriptAsync(
                    "window.__PPBUI_GAME_DOCK_REANNOUNCE__()");
                for (var attempt = 0; attempt < 12 && pane.ViewCapabilitySeq == beforeReannounce; attempt++)
                {
                    await Task.Delay(75);
                    Application.DoEvents();
                }
                if (!pane.WorkspaceBridgeReady || pane.ViewCapabilitySeq <= beforeReannounce
                    || !pane.PendingWorkspaceRequests.ContainsKey(retainedOpenId))
                    throw new InvalidOperationException("Same-session capability refresh cleared a pending native action.");
            }
            finally { pane.PendingWorkspaceRequests.Remove(retainedOpenId); }

            var surfacesBefore = new HashSet<string>(pane.AvailableSurfaces, StringComparer.OrdinalIgnoreCase);
            var currentSequence = pane.ViewCapabilitySeq;
            var poisoned = new List<WorkspaceBridgeSurface> { new WorkspaceBridgeSurface
                { Id = "inventory", Label = "Replay", Available = false } };
            HandleWorkspaceBridgeMessage(pane, WorkspaceBridgeProtocol.Serialize(new WorkspaceBridgeMessage
            {
                Type = WorkspaceBridgeProtocol.CapabilitiesType,
                Protocol = WorkspaceBridgeProtocol.Version,
                RequestId = "old-document-capabilities",
                SessionId = oldSession,
                DocumentEpoch = oldEpoch,
                MountOrdinal = oldMount,
                CapabilitySeq = oldCapabilitySeq + 100,
                Surfaces = poisoned
            }));
            HandleWorkspaceBridgeMessage(pane, WorkspaceBridgeProtocol.Serialize(new WorkspaceBridgeMessage
            {
                Type = WorkspaceBridgeProtocol.CapabilitiesType,
                Protocol = WorkspaceBridgeProtocol.Version,
                RequestId = "duplicate-document-capabilities",
                SessionId = pane.ViewSessionId,
                DocumentEpoch = pane.ViewDocumentEpoch,
                MountOrdinal = pane.ViewMountOrdinal,
                CapabilitySeq = currentSequence,
                Surfaces = poisoned
            }));
            // A higher ordinal with the current epoch cannot take over a pane
            // unless the host first issued its document-session challenge.
            HandleWorkspaceBridgeMessage(pane, WorkspaceBridgeProtocol.Serialize(new WorkspaceBridgeMessage
            {
                Type = WorkspaceBridgeProtocol.CapabilitiesType,
                Protocol = WorkspaceBridgeProtocol.Version,
                RequestId = "never-issued-session",
                SessionId = Guid.NewGuid().ToString("N"),
                DocumentEpoch = pane.ViewDocumentEpoch,
                MountOrdinal = pane.ViewMountOrdinal + 1,
                CapabilitySeq = currentSequence + 1,
                Surfaces = poisoned
            }));
            var inFlightId = "new-document-open";
            pane.PendingWorkspaceRequests[inFlightId] = "inventory";
            try
            {
                HandleWorkspaceBridgeMessage(pane, WorkspaceBridgeProtocol.Serialize(new WorkspaceBridgeMessage
                {
                    Type = WorkspaceBridgeProtocol.OpenSurfaceResultType,
                    Protocol = WorkspaceBridgeProtocol.Version,
                    RequestId = inFlightId, SurfaceId = "inventory", Ok = false,
                    SessionId = oldSession, DocumentEpoch = oldEpoch, MountOrdinal = oldMount
                }));
                if (!pane.WorkspaceBridgeReady || pane.ViewCapabilitySeq != currentSequence
                    || !surfacesBefore.SetEquals(pane.AvailableSurfaces)
                    || !pane.PendingWorkspaceRequests.ContainsKey(inFlightId))
                    throw new InvalidOperationException("Stale same-URL capabilities/result replaced current native state.");
            }
            finally { pane.PendingWorkspaceRequests.Remove(inFlightId); }

            var inPageRevision = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_COUPLED_VIEW_REVISION__");
            var inPageSession = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_SESSION__");
            if (!string.Equals(inPageRevision, pane.ViewRevision.ToString(), StringComparison.Ordinal)
                || inPageSession.IndexOf(pane.ViewSessionId, StringComparison.Ordinal) < 0)
                throw new InvalidOperationException("Reloaded page did not accept latest native view revision/session.");
            Console.WriteLine("CW-PERF-002 same-URL document-epoch replay and dual-account isolation: PASS");
        }

        private async Task RunGameDockBridgeSmokeAsync(AccountPane rhyxusPane, AccountPane rhyosaPane)
        {
            // A session-hello emitted before NavigationCompleted is deliberately
            // discarded; allow the isolated page to retry its 125ms hello.
            for (var attempt = 0; attempt < 16
                && (!rhyxusPane.WorkspaceBridgeReady || !rhyosaPane.WorkspaceBridgeReady); attempt++)
            {
                await Task.Delay(100);
                Application.DoEvents();
            }
            if (!rhyxusPane.WorkspaceBridgeReady || !rhyosaPane.WorkspaceBridgeReady)
                throw new InvalidOperationException("Game Dock bridge capabilities were not received for both panes.");
            var rhyxusAccepted = await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_ACCEPTED__"
            );
            var rhyosaAccepted = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_ACCEPTED__"
            );
            if (!string.Equals(rhyxusAccepted, "true", StringComparison.Ordinal)
                || !string.Equals(rhyosaAccepted, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("Game Dock capability handshake was not acknowledged by both panes.");
            var rhyxusView = await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_COUPLED_VIEW__"
            );
            var rhyosaView = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_COUPLED_VIEW__"
            );
            if (rhyxusView.IndexOf("cards", StringComparison.Ordinal) < 0
                || rhyosaView.IndexOf("cards", StringComparison.Ordinal) < 0
                || !rhyxusPane.CardsViewActive
                || !rhyosaPane.CardsViewActive
                || _rootLayout.RowStyles[2].Height != DpiMetric(44)
                || _cardsViewButton.AccessibleName.IndexOf("current", StringComparison.OrdinalIgnoreCase) < 0
                || _gameViewButton.AccessibleName.IndexOf("current", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                throw new InvalidOperationException("Card dashboard did not become the default accessible coupled view.");
            }
            if (!rhyxusPane.AvailableSurfaces.Contains("inventory")
                || rhyosaPane.AvailableSurfaces.Contains("inventory")
                || !rhyosaPane.AvailableSurfaces.Contains("hunts")
                || !rhyxusPane.AvailableSurfaces.Contains("npc-shop")
                || !rhyxusPane.AvailableSurfaces.Contains("hunt-analyzer")
                || !rhyosaPane.AvailableSurfaces.Contains("hunt-analyzer")
                || rhyxusPane.AvailableSurfaces.Contains("not-allowed")
                || rhyosaPane.AvailableSurfaces.Contains("not-allowed"))
            {
                throw new InvalidOperationException("Game Dock capability filtering failed.");
            }

            var rhyxusAccountButton = _gameDockAccountButtons[ProfileRegistry.Rhyxus.Id];
            var rhyosaAccountButton = _gameDockAccountButtons[ProfileRegistry.Rhyosa.Id];
            if (!rhyxusAccountButton.Visible || !rhyosaAccountButton.Visible)
                throw new InvalidOperationException("Dual Game Dock account selectors were hidden.");
            // Smoke executes inside the workspace mutation gate; exercise its synchronous
            // selection path here while the real button routes through the same gate.
            SetActiveProfile(ProfileRegistry.Rhyosa.Id);
            if (!string.Equals(_workspaceState.ActiveProfileId, ProfileRegistry.Rhyosa.Id, StringComparison.OrdinalIgnoreCase)
                || !(rhyosaAccountButton.Tag is bool && (bool)rhyosaAccountButton.Tag)
                || !_gameDockButtons["hunts"].Enabled
                || _gameDockButtons["inventory"].Enabled
                || !rhyxusPane.CardsViewActive
                || !rhyosaPane.CardsViewActive)
            {
                throw new InvalidOperationException(
                    "Selecting Rhyosa in the Game Dock changed the wrong context or view: active="
                    + _workspaceState.ActiveProfileId
                    + " selected=" + rhyosaAccountButton.Tag
                    + " hunts=" + _gameDockButtons["hunts"].Enabled
                    + " inventory=" + _gameDockButtons["inventory"].Enabled
                    + " view=" + rhyxusPane.CardsViewActive + "/" + rhyosaPane.CardsViewActive + "."
                );
            }
            SetActiveProfile(ProfileRegistry.Rhyxus.Id);
            if (!string.Equals(_workspaceState.ActiveProfileId, ProfileRegistry.Rhyxus.Id, StringComparison.OrdinalIgnoreCase)
                || !(rhyxusAccountButton.Tag is bool && (bool)rhyxusAccountButton.Tag)
                || !_gameDockButtons["inventory"].Enabled)
            {
                throw new InvalidOperationException("Game Dock account selection did not return to Rhyxus.");
            }

            SetContentView(false);
            await Task.Delay(20);
            Application.DoEvents();
            rhyxusView = await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_COUPLED_VIEW__"
            );
            rhyosaView = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_COUPLED_VIEW__"
            );
            if (rhyxusView.IndexOf("game", StringComparison.Ordinal) < 0
                || rhyosaView.IndexOf("cards", StringComparison.Ordinal) < 0
                || rhyxusPane.CardsViewActive
                || !rhyosaPane.CardsViewActive
                || _gameViewButton.AccessibleName.IndexOf("current", StringComparison.OrdinalIgnoreCase) < 0
                || _cardsViewButton.AccessibleName.IndexOf("current", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                throw new InvalidOperationException("Cards/Game view switching was not isolated to the active Rhyxus pane.");
            }
            AssertGameDockGeometry("mixed Cards/Game");

            SetActiveProfile(ProfileRegistry.Rhyosa.Id);
            rhyxusView = await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_COUPLED_VIEW__"
            );
            rhyosaView = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_COUPLED_VIEW__"
            );
            if (rhyxusView.IndexOf("game", StringComparison.Ordinal) < 0
                || rhyosaView.IndexOf("cards", StringComparison.Ordinal) < 0
                || _cardsViewButton.AccessibleName.IndexOf("current", StringComparison.OrdinalIgnoreCase) < 0
                || _gameViewButton.AccessibleName.IndexOf("current", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                throw new InvalidOperationException("Changing Active profile mutated pane view state instead of only updating selector state.");
            }
            SetContentView(false);
            await Task.Delay(20);
            Application.DoEvents();
            rhyxusView = await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_COUPLED_VIEW__"
            );
            rhyosaView = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_COUPLED_VIEW__"
            );
            if (rhyxusView.IndexOf("game", StringComparison.Ordinal) < 0
                || rhyosaView.IndexOf("game", StringComparison.Ordinal) < 0
                || rhyxusPane.CardsViewActive
                || rhyosaPane.CardsViewActive)
            {
                throw new InvalidOperationException("Independent pane view toggles did not allow both panes to reach Game explicitly.");
            }
            AssertGameDockGeometry("dual Game");

            if (!IsCurrentBridgeMessageSource(rhyxusPane, rhyxusPane.View.CoreWebView2.Source))
                throw new InvalidOperationException("Current Game Dock bridge source was rejected.");
            var staleSource = new Uri(Path.Combine(_baseDir, "smoke", "stale.html")).AbsoluteUri;
            if (IsCurrentBridgeMessageSource(rhyxusPane, staleSource))
                throw new InvalidOperationException("Stale Game Dock bridge source was accepted.");

            HandleWorkspaceBridgeMessage(
                rhyosaPane,
                WorkspaceBridgeProtocol.Serialize(new WorkspaceBridgeMessage
                {
                    Type = WorkspaceBridgeProtocol.OpenSurfaceResultType,
                    Protocol = WorkspaceBridgeProtocol.Version,
                    RequestId = "spoofed-result",
                    SurfaceId = "hunts",
                    Ok = false,
                    Error = "spoof"
                })
            );
            if (!rhyosaPane.AvailableSurfaces.Contains("hunts"))
                throw new InvalidOperationException("Uncorrelated Game Dock result mutated capabilities.");

            SetActiveProfile(ProfileRegistry.Rhyxus.Id);
            if (!_gameDockButtons["inventory"].Enabled
                || !_gameDockButtons["hunts"].Enabled
                || !_gameDockButtons["npc-shop"].Enabled
                || _gameDockButtons.ContainsKey("hunt-analyzer"))
                throw new InvalidOperationException("Rhyxus Game Dock did not enable advertised destinations.");
            var analyzerOverflowItem = FindGameDockOverflowItem("hunt-analyzer");
            if (_gameDockOverflowButton == null
                || !_gameDockOverflowButton.Enabled
                || analyzerOverflowItem == null
                || !analyzerOverflowItem.Enabled
                || FindGameDockOverflowItem("npc-shop") != null)
            {
                throw new InvalidOperationException("Game Dock quick/overflow partition is incorrect.");
            }
            foreach (ToolStripItem overflowItem in _gameDockOverflowMenu.Items)
            {
                if (IsQuickGameDockSurface(overflowItem.Tag as string))
                    throw new InvalidOperationException("Game Dock overflow duplicated a quick-access destination.");
            }
            ShowGameDockOverflowMenu();
            Application.DoEvents();
            var overflowButtonTop = _gameDockOverflowButton.RectangleToScreen(
                _gameDockOverflowButton.ClientRectangle
            ).Top;
            if (!_gameDockOverflowMenu.Visible
                || _gameDockOverflowMenu.Bottom > overflowButtonTop + DpiMetric(2))
            {
                throw new InvalidOperationException("Game Dock overflow did not open above the bottom bar.");
            }
            var openOverflowItem = analyzerOverflowItem;
            SetActiveProfile(ProfileRegistry.Rhyxus.Id);
            UpdateGameDock();
            if (!_gameDockOverflowMenu.Visible
                || !object.ReferenceEquals(openOverflowItem, FindGameDockOverflowItem("hunt-analyzer")))
                throw new InvalidOperationException("Redundant Game Dock update closed or replaced an open menu.");
            var originalFavorites = _workspaceState.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id];
            var reorderedFavorites = new List<string>(originalFavorites);
            var firstFavorite = reorderedFavorites[0];
            reorderedFavorites[0] = reorderedFavorites[1];
            reorderedFavorites[1] = firstFavorite;
            _workspaceState.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id] = reorderedFavorites;
            try
            {
                UpdateGameDock();
                if (!_gameDockOverflowMenu.Visible
                    || !object.ReferenceEquals(openOverflowItem, FindGameDockOverflowItem("hunt-analyzer")))
                    throw new InvalidOperationException("Quick slot reorder closed unchanged Overflow menu.");
            }
            finally
            {
                _workspaceState.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id] = originalFavorites;
                UpdateGameDock();
            }
            rhyxusPane.AvailableSurfaces.Remove("hunt-analyzer");
            UpdateGameDock();
            if (_gameDockOverflowMenu.Visible || FindGameDockOverflowItem("hunt-analyzer") != null)
                throw new InvalidOperationException("Revoked Overflow capability remained actionable.");
            rhyxusPane.AvailableSurfaces.Add("hunt-analyzer");
            UpdateGameDock();
            if (FindGameDockOverflowItem("hunt-analyzer") == null)
                throw new InvalidOperationException("Restored Overflow capability was not rebuilt.");
            _gameDockOverflowMenu.Close(ToolStripDropDownCloseReason.CloseCalled);
            OpenGameSurface("inventory");
            await Task.Delay(30);
            Application.DoEvents();
            var leftOpened = await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            var rightOpened = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            if (leftOpened.IndexOf("inventory", StringComparison.Ordinal) < 0
                || rightOpened.IndexOf("inventory", StringComparison.Ordinal) >= 0)
                throw new InvalidOperationException("Game Dock did not target only the active Rhyxus pane.");
            if (rhyxusPane.PendingWorkspaceRequests.Count != 0)
                throw new InvalidOperationException("Completed Game Dock request remained pending for Rhyxus.");

            _gameDockButtons["npc-shop"].PerformClick();
            await Task.Delay(30);
            Application.DoEvents();
            leftOpened = await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            rightOpened = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            if (leftOpened.IndexOf("npc-shop", StringComparison.Ordinal) < 0
                || rightOpened.IndexOf("npc-shop", StringComparison.Ordinal) >= 0)
                throw new InvalidOperationException("Mark's Shop quick action did not target only active Rhyxus.");
            if (rhyxusPane.PendingWorkspaceRequests.Count != 0)
                throw new InvalidOperationException("Completed Mark's Shop request remained pending for Rhyxus.");

            SetActiveProfile(ProfileRegistry.Rhyosa.Id);
            SetContentView(true);
            SetActiveProfile(ProfileRegistry.Rhyxus.Id);
            SetContentView(true);
            analyzerOverflowItem = FindGameDockOverflowItem("hunt-analyzer");
            if (analyzerOverflowItem == null)
                throw new InvalidOperationException("Hunt Analyzer overflow item was lost before Cards-mode action smoke.");
            analyzerOverflowItem.PerformClick();
            await Task.Delay(30);
            Application.DoEvents();
            leftOpened = await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            rightOpened = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            if (leftOpened.IndexOf("hunt-analyzer", StringComparison.Ordinal) < 0
                || rightOpened.IndexOf("hunt-analyzer", StringComparison.Ordinal) >= 0
                || rhyxusPane.CardsViewActive
                || !rhyosaPane.CardsViewActive)
                throw new InvalidOperationException("Game Dock did not route Hunt Analyzer only to active Rhyxus pane.");
            if (rhyxusPane.PendingWorkspaceRequests.Count != 0)
                throw new InvalidOperationException("Completed Hunt Analyzer request remained pending for Rhyxus.");

            SetActiveProfile(ProfileRegistry.Rhyosa.Id);
            if (_gameDockButtons["inventory"].Enabled || !_gameDockButtons["hunts"].Enabled)
                throw new InvalidOperationException("Game Dock did not fail closed for Rhyosa capabilities.");
            OpenGameSurface("hunts");
            await Task.Delay(30);
            Application.DoEvents();
            rightOpened = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            if (rightOpened.IndexOf("hunts", StringComparison.Ordinal) < 0)
                throw new InvalidOperationException("Game Dock did not route Hunts to active Rhyosa pane.");
            if (rhyosaPane.PendingWorkspaceRequests.Count != 0)
                throw new InvalidOperationException("Completed Game Dock request remained pending for Rhyosa.");

            OpenGameSurface("inventory");
            await Task.Delay(20);
            var unavailableOpened = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            if (unavailableOpened.IndexOf("hunts", StringComparison.Ordinal) < 0)
                throw new InvalidOperationException("Unavailable Game Dock destination was not blocked.");

            var rhyxusCardsBeforeLayoutChanges = rhyxusPane.CardsViewActive;
            var rhyosaCardsBeforeLayoutChanges = rhyosaPane.CardsViewActive;
            SwapPanes();
            if (rhyxusPane.CardsViewActive != rhyxusCardsBeforeLayoutChanges
                || rhyosaPane.CardsViewActive != rhyosaCardsBeforeLayoutChanges)
            {
                throw new InvalidOperationException("Physical pane Swap mutated profile-owned Cards/Game state.");
            }
            OpenGameSurface("storage");
            await Task.Delay(30);
            Application.DoEvents();
            rightOpened = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            if (rightOpened.IndexOf("storage", StringComparison.Ordinal) < 0)
                throw new InvalidOperationException("Game Dock target changed with physical pane Swap.");

            EnterFocusMode();
            if (rhyxusPane.CardsViewActive != rhyxusCardsBeforeLayoutChanges
                || rhyosaPane.CardsViewActive != rhyosaCardsBeforeLayoutChanges)
            {
                throw new InvalidOperationException("Focus mode mutated profile-owned Cards/Game state.");
            }
            OpenGameSurface("auto-helper");
            await Task.Delay(30);
            Application.DoEvents();
            rightOpened = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_OPENED__"
            );
            if (rightOpened.IndexOf("auto-helper", StringComparison.Ordinal) < 0)
                throw new InvalidOperationException("Game Dock target changed in Focus mode.");
            RestoreFocusMode();
            if (rhyxusPane.CardsViewActive != rhyxusCardsBeforeLayoutChanges
                || rhyosaPane.CardsViewActive != rhyosaCardsBeforeLayoutChanges)
            {
                throw new InvalidOperationException("Focus Restore mutated profile-owned Cards/Game state.");
            }
            SwapPanes();
            SetActiveProfile(ProfileRegistry.Rhyxus.Id);
            await RunGameDockOfflineBridgeSmokeAsync(rhyxusPane);
            await RunHostQoLSmokeAsync(rhyxusPane, rhyosaPane);
        }

        private async Task RunHostQoLSmokeAsync(AccountPane rhyxusPane, AccountPane rhyosaPane)
        {
            var originalRhyxus = new List<string>(GetQuickGameDockSurfaces(ProfileRegistry.Rhyxus.Id));
            var originalRhyosa = new List<string>(GetQuickGameDockSurfaces(ProfileRegistry.Rhyosa.Id));
            var zoomRhyxus = _workspaceState.ZoomByProfile[ProfileRegistry.Rhyxus.Id];
            var zoomRhyosa = _workspaceState.ZoomByProfile[ProfileRegistry.Rhyosa.Id];
            try
            {
                SetActiveProfile(ProfileRegistry.Rhyxus.Id);
                SetGameDockQuickSlot(ProfileRegistry.Rhyxus.Id, 0, "HuNt-AnAlYzEr");
                if (GetQuickGameDockSurfaces(ProfileRegistry.Rhyxus.Id)[0] != "hunt-analyzer"
                    || !_gameDockButtons.ContainsKey("hunt-analyzer")
                    || _gameDockButtons["hunt-analyzer"].Name != "hunt-analyzer"
                    || FindGameDockOverflowItem("inventory") == null
                    || FindGameDockOverflowItem("hunt-analyzer") != null)
                    throw new InvalidOperationException("Mixed-case quick slot did not normalize to the native bridge ID.");

                SetGameDockQuickSlot(ProfileRegistry.Rhyxus.Id, 1, "team");
                if (GetQuickGameDockSurfaces(ProfileRegistry.Rhyxus.Id)[1] != "team"
                    || GetQuickGameDockSurfaces(ProfileRegistry.Rhyxus.Id)[3] != "hunts")
                    throw new InvalidOperationException("Selecting an existing favorite did not swap unique slots.");

                await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                    "window.__PPBUI_GAME_DOCK_OPENED__='';"
                );
                await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                    "window.__PPBUI_GAME_DOCK_OPENED__='';"
                );
                _gameDockButtons["hunt-analyzer"].PerformClick();
                await Task.Delay(35);
                Application.DoEvents();
                var rhyxusOpened = await rhyxusPane.View.CoreWebView2.ExecuteScriptAsync(
                    "window.__PPBUI_GAME_DOCK_OPENED__"
                );
                var rhyosaOpened = await rhyosaPane.View.CoreWebView2.ExecuteScriptAsync(
                    "window.__PPBUI_GAME_DOCK_OPENED__"
                );
                if (rhyxusOpened.IndexOf("hunt-analyzer", StringComparison.Ordinal) < 0
                    || rhyosaOpened.IndexOf("hunt-analyzer", StringComparison.Ordinal) >= 0)
                    throw new InvalidOperationException("Customized quick slot did not retain active-only bridge routing.");

                SetActiveProfile(ProfileRegistry.Rhyosa.Id);
                if (GetQuickGameDockSurfaces(ProfileRegistry.Rhyosa.Id)[0] != "inventory"
                    || _gameDockButtons.ContainsKey("hunt-analyzer"))
                    throw new InvalidOperationException("Quick slot customization leaked into the other profile.");
                SetGameDockQuickSlot(ProfileRegistry.Rhyosa.Id, 2, "inventory");
                if (GetQuickGameDockSurfaces(ProfileRegistry.Rhyosa.Id)[2] != "inventory"
                    || GetQuickGameDockSurfaces(ProfileRegistry.Rhyosa.Id)[0] != "npc-shop"
                    || _gameDockButtons["inventory"].Enabled)
                    throw new InvalidOperationException("Unavailable customized shortcut was not fail-closed.");

                SetProfileZoom(ProfileRegistry.Rhyosa.Id, 0.90);
                SetActiveProfile(ProfileRegistry.Rhyxus.Id);
                SetProfileZoom(ProfileRegistry.Rhyxus.Id, 1.25);
                if (Math.Abs(rhyxusPane.View.ZoomFactor - 1.25) > 0.001
                    || Math.Abs(rhyosaPane.View.ZoomFactor - 0.90) > 0.001)
                    throw new InvalidOperationException("Zoom was not isolated and applied to each WebView2 profile.");
                SwapPanes();
                EnterFocusMode();
                if (Math.Abs(rhyxusPane.View.ZoomFactor - 1.25) > 0.001
                    || Math.Abs(rhyosaPane.View.ZoomFactor - 0.90) > 0.001)
                    throw new InvalidOperationException("Swap or Focus changed zoom ownership.");
                RestoreFocusMode();
                SwapPanes();

                ResetWorkspaceLayout();
                if (Math.Abs(rhyxusPane.View.ZoomFactor - 1.0) > 0.001
                    || Math.Abs(rhyosaPane.View.ZoomFactor - 1.0) > 0.001
                    || Math.Abs(_workspaceState.ZoomByProfile[ProfileRegistry.Rhyxus.Id] - 1.0) > 0.001
                    || Math.Abs(_workspaceState.ZoomByProfile[ProfileRegistry.Rhyosa.Id] - 1.0) > 0.001)
                    throw new InvalidOperationException("Reset layout must apply default zoom to both live WebView2 profiles.");

                var requestId = "qol-correlated-failure";
                _latestDockUiRequestByProfile[rhyxusPane.Profile.Id] = requestId;
                rhyxusPane.PendingWorkspaceRequests[requestId] = "hunt-analyzer";
                HandleWorkspaceBridgeMessage(rhyxusPane, WorkspaceBridgeProtocol.Serialize(
                    WithCurrentSmokeViewSession(rhyxusPane, new WorkspaceBridgeMessage
                    {
                        Type = WorkspaceBridgeProtocol.OpenSurfaceResultType,
                        Protocol = WorkspaceBridgeProtocol.Version,
                        RequestId = requestId,
                        SurfaceId = "hunt-analyzer",
                        Ok = false,
                        Error = "surface-unavailable"
                    })
                ));
                if (rhyxusPane.PendingWorkspaceRequests.ContainsKey(requestId)
                    || _gameDockAvailabilityLabel.Text != "OPEN FAILED"
                    || _gameDockAvailabilityLabel.AccessibleName.IndexOf("Hunt Analyzer", StringComparison.Ordinal) < 0
                    || _gameDockButtons["hunt-analyzer"].Enabled)
                    throw new InvalidOperationException("Correlated native menu failure was not visible and accessible.");

                var oldRequest = "qol-out-of-order-old";
                var newRequest = "qol-out-of-order-new";
                rhyxusPane.PendingWorkspaceRequests[oldRequest] = "team";
                rhyxusPane.PendingWorkspaceRequests[newRequest] = "storage";
                _latestDockUiRequestByProfile[rhyxusPane.Profile.Id] = newRequest;
                HandleWorkspaceBridgeMessage(rhyxusPane, WorkspaceBridgeProtocol.Serialize(
                    WithCurrentSmokeViewSession(rhyxusPane, new WorkspaceBridgeMessage
                    {
                        Type = WorkspaceBridgeProtocol.OpenSurfaceResultType,
                        Protocol = WorkspaceBridgeProtocol.Version,
                        RequestId = oldRequest, SurfaceId = "team", Ok = true
                    })
                ));
                if (_gameDockAvailabilityLabel.Text != "OPEN FAILED"
                    || _gameDockAvailabilityLabel.AccessibleName.IndexOf("Hunt Analyzer", StringComparison.Ordinal) < 0)
                    throw new InvalidOperationException("Older correlated success cleared a newer failure message.");
                HandleWorkspaceBridgeMessage(rhyxusPane, WorkspaceBridgeProtocol.Serialize(
                    WithCurrentSmokeViewSession(rhyxusPane, new WorkspaceBridgeMessage
                    {
                        Type = WorkspaceBridgeProtocol.OpenSurfaceResultType,
                        Protocol = WorkspaceBridgeProtocol.Version,
                        RequestId = newRequest, SurfaceId = "storage", Ok = false
                    })
                ));
                if (_gameDockAvailabilityLabel.Text != "OPEN FAILED"
                    || _gameDockAvailabilityLabel.AccessibleName.IndexOf("Storage", StringComparison.Ordinal) < 0)
                    throw new InvalidOperationException("Newest correlated failure did not replace previous feedback.");

                var oldSuccess = "qol-out-of-order-success-old";
                var newSuccess = "qol-out-of-order-success-new";
                rhyxusPane.PendingWorkspaceRequests[oldSuccess] = "team";
                rhyxusPane.PendingWorkspaceRequests[newSuccess] = "inventory";
                _latestDockUiRequestByProfile[rhyxusPane.Profile.Id] = newSuccess;
                HandleWorkspaceBridgeMessage(rhyxusPane, WorkspaceBridgeProtocol.Serialize(
                    WithCurrentSmokeViewSession(rhyxusPane, new WorkspaceBridgeMessage
                    {
                        Type = WorkspaceBridgeProtocol.OpenSurfaceResultType,
                        Protocol = WorkspaceBridgeProtocol.Version,
                        RequestId = newSuccess, SurfaceId = "inventory", Ok = true
                    })
                ));
                HandleWorkspaceBridgeMessage(rhyxusPane, WorkspaceBridgeProtocol.Serialize(
                    WithCurrentSmokeViewSession(rhyxusPane, new WorkspaceBridgeMessage
                    {
                        Type = WorkspaceBridgeProtocol.OpenSurfaceResultType,
                        Protocol = WorkspaceBridgeProtocol.Version,
                        RequestId = oldSuccess, SurfaceId = "team", Ok = false
                    })
                ));
                if (_gameDockAvailabilityLabel.Text != "MENUS READY"
                    || rhyxusPane.PendingWorkspaceRequests.ContainsKey(oldSuccess)
                    || rhyxusPane.PendingWorkspaceRequests.ContainsKey(newSuccess))
                    throw new InvalidOperationException("Older correlated failure replaced newer successful feedback.");
                SetActiveProfile(ProfileRegistry.Rhyosa.Id);
                if (_gameDockAvailabilityLabel.Text == "OPEN FAILED")
                    throw new InvalidOperationException("Native menu failure feedback leaked to inactive account.");
            }
            finally
            {
                _workspaceState.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id] = originalRhyxus;
                _workspaceState.QuickSurfacesByProfile[ProfileRegistry.Rhyosa.Id] = originalRhyosa;
                _latestDockUiRequestByProfile.Remove(ProfileRegistry.Rhyxus.Id);
                _latestDockUiRequestByProfile.Remove(ProfileRegistry.Rhyosa.Id);
                _workspaceState.ZoomByProfile[ProfileRegistry.Rhyxus.Id] = zoomRhyxus;
                _workspaceState.ZoomByProfile[ProfileRegistry.Rhyosa.Id] = zoomRhyosa;
                TryApplyPaneZoom(rhyxusPane);
                TryApplyPaneZoom(rhyosaPane);
                ClearDockOpenFeedback();
                SetActiveProfile(ProfileRegistry.Rhyxus.Id);
                UpdateGameDock();
            }
            // Restore the catalog from the real local page, advancing the
            // JS/host capability generation together.
            await ReannounceSmokeCapabilitiesAsync(rhyxusPane);
        }

        private async Task ReannounceSmokeCapabilitiesAsync(AccountPane pane)
        {
            var previous = pane.ViewCapabilitySeq;
            if (!RequestCurrentViewCapabilities(pane))
                throw new InvalidOperationException("Native local-page capability refresh was not delivered.");
            for (var attempt = 0; attempt < 12
                && (!pane.WorkspaceBridgeReady || pane.ViewCapabilitySeq == previous); attempt++)
            {
                await Task.Delay(75);
                Application.DoEvents();
            }
            if (!pane.WorkspaceBridgeReady || pane.ViewCapabilitySeq <= previous)
                throw new InvalidOperationException("Local page capability generation failed to recover.");
        }

        private async Task RunGameDockOfflineBridgeSmokeAsync(AccountPane pane)
        {
            if (pane == null) throw new InvalidOperationException("Offline Game Dock smoke requires an active pane.");
            pane.ResetWorkspaceBridge();
            UpdateGameDock();
            if (!_gameDock.Visible
                || _rootLayout.RowStyles[2].Height != DpiMetric(44)
                || _cardsViewButton == null
                || !_cardsViewButton.Enabled
                || _gameViewButton == null
                || !_gameViewButton.Enabled
                || _gameDockAvailabilityLabel == null
                || !_gameDockAvailabilityLabel.Visible
                || _gameDockAvailabilityLabel.Text.IndexOf("MENUS OFFLINE", StringComparison.Ordinal) < 0)
            {
                throw new InvalidOperationException("Bridge-unavailable state hid or trapped the persistent Game Dock.");
            }
            foreach (var button in _gameDockButtons.Values)
            {
                if (button.Enabled)
                    throw new InvalidOperationException("Native module remained enabled while Game Dock bridge was unavailable.");
            }
            if (_gameDockOverflowButton == null
                || _gameDockOverflowButton.Enabled
                || _gameDockOverflowMenu == null
                || _gameDockOverflowMenu.Items.Count != 0)
            {
                throw new InvalidOperationException("Game Dock overflow remained actionable while the bridge was unavailable.");
            }

            await ReannounceSmokeCapabilitiesAsync(pane);
            var nativeShop = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "Boolean(document.querySelector('[data-menu-id=\"npc-shop\"]'))");
            // The core fixture intentionally advertises the full synthetic
            // catalog. The visual-page adapter instead advertises only actual
            // native toolbar actions. Identify which client owns this pane.
            var stubSession = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "window.__PPBUI_GAME_DOCK_SESSION__");
            var syntheticCatalog = stubSession.IndexOf(pane.ViewSessionId, StringComparison.Ordinal) >= 0;
            var expectedShop = syntheticCatalog || string.Equals(nativeShop, "true", StringComparison.Ordinal);
            if (!pane.WorkspaceBridgeReady
                || !_gameDockAvailabilityLabel.Visible
                || _gameDockAvailabilityLabel.Text != "MENUS READY"
                || !_gameDockButtons["inventory"].Enabled
                || !_gameDockButtons["hunts"].Enabled
                || _gameDockButtons["npc-shop"].Enabled != expectedShop
                || !_gameDockOverflowButton.Enabled
                || FindGameDockOverflowItem("hunt-analyzer") == null)
            {
                throw new InvalidOperationException("Game Dock did not recover after bridge capabilities returned.");
            }
        }

        private void RunDpiMetricSmoke()
        {
            if (AutoScaleMode != AutoScaleMode.Dpi)
                throw new InvalidOperationException("Workspace DPI autoscaling is not enabled.");

            var expectations = new[]
            {
                new[] { 28, 120, 35 },
                new[] { 28, 144, 42 },
                new[] { 44, 120, 55 },
                new[] { 44, 144, 66 },
                new[] { 320, 120, 400 },
                new[] { 320, 144, 480 },
                new[] { 1180, 120, 1475 },
                new[] { 1180, 144, 1770 },
                new[] { ExpandedDeckMinimumWidth, 120, 1900 },
                new[] { ExpandedDeckMinimumWidth, 144, 2280 }
            };
            foreach (var expectation in expectations)
            {
                var actual = ScaleLogicalPixels(expectation[0], expectation[1]);
                if (actual != expectation[2])
                {
                    throw new InvalidOperationException(
                        "Logical DPI metric scaling failed: logical=" + expectation[0]
                        + " dpi=" + expectation[1]
                        + " expected=" + expectation[2]
                        + " actual=" + actual + "."
                    );
                }
            }

            var secondaryWorkingArea = new Rectangle(1920, -200, 2560, 1440);
            var syntheticDrawer = new Size(450, 600);
            var lowerRight = ClampDrawerLocation(
                new Point(4400, 1300),
                secondaryWorkingArea,
                syntheticDrawer
            );
            if (lowerRight.X != 3950 || lowerRight.Y != 640)
            {
                throw new InvalidOperationException(
                    "Cross-monitor drawer lower/right clamp failed: " + lowerRight + "."
                );
            }

            var upperLeft = ClampDrawerLocation(
                new Point(1950, -150),
                secondaryWorkingArea,
                syntheticDrawer
            );
            if (upperLeft.X != secondaryWorkingArea.Left || upperLeft.Y != -150)
            {
                throw new InvalidOperationException(
                    "Cross-monitor drawer upper/left clamp failed: " + upperLeft + "."
                );
            }

        }

        private async Task RunWorkspaceLifecycleSmokeAsync(
            AccountPane originalLeftPane,
            AccountPane originalRightPane
        )
        {
            var leftUdf = originalLeftPane.Environment.UserDataFolder;
            var rightUdf = originalRightPane.Environment.UserDataFolder;
            var originalLeftZoom = _workspaceState.ZoomByProfile[ProfileRegistry.Rhyxus.Id];
            var originalRightZoom = _workspaceState.ZoomByProfile[ProfileRegistry.Rhyosa.Id];
            _workspaceState.ZoomByProfile[ProfileRegistry.Rhyxus.Id] = 1.10;
            _workspaceState.ZoomByProfile[ProfileRegistry.Rhyosa.Id] = 0.90;
            TryApplyPaneZoom(originalLeftPane);
            TryApplyPaneZoom(originalRightPane);

            SetContentView(ProfileRegistry.Rhyxus.Id, true);
            SetContentView(ProfileRegistry.Rhyosa.Id, false);

            _workspaceState.ActiveProfileId = ProfileRegistry.Rhyosa.Id;
            await SwitchToSingleAsync(_workspaceState.ActiveProfileId);

            var singlePane = GetPaneForProfile(ProfileRegistry.Rhyosa.Id);
            if (_workspaceState.Mode != WorkspaceMode.Single
                || !_split.Panel2Collapsed
                || _panesByProfile.Count != 1
                || !object.ReferenceEquals(singlePane, originalRightPane)
                || singlePane.CardsViewActive
                || Math.Abs(singlePane.View.ZoomFactor - 0.90) > 0.001
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
                || !restoredLeft.CardsViewActive
                || restoredRight.CardsViewActive
                || Math.Abs(restoredLeft.View.ZoomFactor - 1.10) > 0.001
                || Math.Abs(restoredRight.View.ZoomFactor - 0.90) > 0.001
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
                || !rhyXusSingle.CardsViewActive
                || Math.Abs(rhyXusSingle.View.ZoomFactor - 1.10) > 0.001
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
                || rhyOsaSingle.CardsViewActive
                || Math.Abs(rhyOsaSingle.View.ZoomFactor - 0.90) > 0.001
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
                || !GetPaneForProfile(ProfileRegistry.Rhyxus.Id).CardsViewActive
                || GetPaneForProfile(ProfileRegistry.Rhyosa.Id).CardsViewActive
                || Math.Abs(GetPaneForProfile(ProfileRegistry.Rhyxus.Id).View.ZoomFactor - 1.10) > 0.001
                || Math.Abs(GetPaneForProfile(ProfileRegistry.Rhyosa.Id).View.ZoomFactor - 0.90) > 0.001
                || !string.Equals(
                    _workspaceState.ActiveProfileId,
                    ProfileRegistry.Rhyosa.Id,
                    StringComparison.OrdinalIgnoreCase
                ))
            {
                throw new InvalidOperationException("Final Dual restore after profile switch failed.");
            }
            _workspaceState.ZoomByProfile[ProfileRegistry.Rhyxus.Id] = originalLeftZoom;
            _workspaceState.ZoomByProfile[ProfileRegistry.Rhyosa.Id] = originalRightZoom;
            TryApplyPaneZoom(GetPaneForProfile(ProfileRegistry.Rhyxus.Id));
            TryApplyPaneZoom(GetPaneForProfile(ProfileRegistry.Rhyosa.Id));
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
                _split.SplitterDistance = ClampSplitterDistance(
                    available,
                    halfTarget + DpiMetric(20)
                );
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
            Width = DpiMetric(2000);
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
                _split.SplitterDistance = ClampSplitterDistance(
                    wideAvailable,
                    wideHalf + DpiMetric(30)
                );
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

        private void RunCommandDeckRegressionSmoke(string outputDir)
        {
            if (_workspaceState.Mode != WorkspaceMode.Dual)
                throw new InvalidOperationException("Command Deck regression smoke requires Dual mode.");
            if (_workspaceState.FocusMode) RestoreFocusMode();

            var originalWidth = Width;
            var originalHeight = Height;
            var originalActiveProfileId = _workspaceState.ActiveProfileId;
            try
            {
                _workspaceState.ActiveProfileId = _workspaceState.LeftProfileId;
                var windowWidths = new[] { 1180, 1200, 1280, 1600 };
                foreach (var windowWidth in windowWidths)
                {
                    Width = DpiMetric(windowWidth);
                    PerformLayout();
                    Application.DoEvents();
                    AssertCommandDeckFirstPassStable("window-" + windowWidth);
                    AssertCommandDeckGeometry("window-" + windowWidth);
                    AssertGameDockGeometry("window-" + windowWidth);
                    AssertCurrentContentViewShellGeometry("window-" + windowWidth);

                    if (windowWidth == 1200 || windowWidth == 1280)
                    {
                        CaptureControl(
                            _commandDeck,
                            Path.Combine(
                                outputDir,
                                "command-deck-dual-" + windowWidth + ".png"
                            )
                        );
                    }
                }

                SetSmokeDeckClientWidth(DpiMetric(ExpandedDeckMinimumWidth) - 1);
                AssertCommandDeckFirstPassStable("compact-threshold");
                AssertCommandDeckGeometry("compact-threshold");
                AssertGameDockGeometry("compact-threshold");
                AssertCurrentContentViewShellGeometry("compact-threshold");
                if (_leftStatus.Width != DpiMetric(CompactStatusWidth)
                    || _rightStatus.Width != DpiMetric(CompactStatusWidth))
                {
                    throw new InvalidOperationException(
                        "Command Deck compact threshold did not keep compact health widths."
                    );
                }
                CaptureControl(
                    _commandDeck,
                    Path.Combine(outputDir, "command-deck-dual-compact-threshold.png")
                );

                SetSmokeDeckClientWidth(DpiMetric(ExpandedDeckMinimumWidth));
                AssertCommandDeckFirstPassStable("expanded-threshold");
                AssertCommandDeckGeometry("expanded-threshold");
                AssertGameDockGeometry("expanded-threshold");
                AssertCurrentContentViewShellGeometry("expanded-threshold");
                if (_leftStatus.Width != DpiMetric(ExpandedStatusWidth)
                    || _rightStatus.Width != DpiMetric(ExpandedStatusWidth))
                {
                    throw new InvalidOperationException(
                        "Command Deck expanded threshold did not apply expanded health widths."
                    );
                }
                CaptureControl(
                    _commandDeck,
                    Path.Combine(outputDir, "command-deck-dual-expanded-threshold.png")
                );

                AssertHealthDeckTextFits();
                AssertBetterUiSelectContract();
            }
            finally
            {
                _workspaceState.ActiveProfileId = originalActiveProfileId;
                Width = originalWidth;
                Height = originalHeight;
                PerformLayout();
                UpdateCommandDeck();
                Application.DoEvents();
            }
        }

        private void SetSmokeDeckClientWidth(int targetWidth)
        {
            PerformLayout();
            Application.DoEvents();
            Width += targetWidth - _commandDeck.ClientSize.Width;
            PerformLayout();
            Application.DoEvents();
            if (_commandDeck.ClientSize.Width != targetWidth)
            {
                Width += targetWidth - _commandDeck.ClientSize.Width;
                PerformLayout();
                Application.DoEvents();
            }
            if (_commandDeck.ClientSize.Width != targetWidth)
            {
                throw new InvalidOperationException(
                    "Could not establish Command Deck client width " + targetWidth
                    + "; actual=" + _commandDeck.ClientSize.Width + "."
                );
            }
        }

        private void AssertCommandDeckFirstPassStable(string context)
        {
            UpdateCommandDeck();
            Application.DoEvents();
            var first = CommandDeckGeometrySignature();
            LayoutCommandDeck();
            Application.DoEvents();
            var second = CommandDeckGeometrySignature();
            if (!string.Equals(first, second, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    "Command Deck requires a second layout pass at " + context
                    + ". first=" + first + " second=" + second
                );
            }
        }

        private string CommandDeckGeometrySignature()
        {
            return string.Join(
                "|",
                new[]
                {
                    ControlGeometrySignature(_leftCommandGroup),
                    ControlGeometrySignature(_dualLayoutGroup),
                    ControlGeometrySignature(_rightCommandGroup),
                    ControlGeometrySignature(_leftAccountButton),
                    ControlGeometrySignature(_leftStatus),
                    ControlGeometrySignature(_focusButton),
                    ControlGeometrySignature(_rightAccountButton),
                    ControlGeometrySignature(_rightStatus),
                    ControlGeometrySignature(_scopeSelector)
                }
            );
        }

        private static string ControlGeometrySignature(Control control)
        {
            if (control == null) return "null";
            return (control.Visible ? "1" : "0")
                + ":" + control.Left
                + "," + control.Top
                + "," + control.Width
                + "," + control.Height;
        }

        private void AssertCommandDeckGeometry(string context)
        {
            var deckHeight = DpiMetric(44);
            if (_commandDeck.Height != deckHeight)
            {
                throw new InvalidOperationException(
                    "Command Deck row height regression at " + context
                    + ": " + _commandDeck.Height + "."
                );
            }
            if (_commandDeck.Top != 0
                || _commandDeck.Bottom != deckHeight
                || _split.Top != _commandDeck.Bottom)
            {
                throw new InvalidOperationException(
                    "Workspace viewport seam regression at " + context
                    + ": deck=" + _commandDeck.Bounds
                    + " split=" + _split.Bounds + "."
                );
            }

            AssertToolbarGroupGeometry(_leftCommandGroup, "left", context);
            AssertToolbarGroupGeometry(_dualLayoutGroup, "center", context);
            AssertToolbarGroupGeometry(_rightCommandGroup, "right", context);

            var standardButtons = new[]
            {
                _singleModeButton,
                _dualModeButton,
                _leftAccountButton,
                _layout12Button,
                _layout11Button,
                _layout21Button,
                _swapButton,
                _focusButton,
                _rightAccountButton,
                _homeButton,
                _reloadButton,
                _maintenanceButton
            };
            foreach (var button in standardButtons)
                AssertToolbarControlGeometry(button, DpiMetric(28), context);
            AssertToolbarControlGeometry(_singleProfileSelector, DpiMetric(28), context);
            AssertToolbarControlGeometry(_scopeSelector, DpiMetric(28), context);
            AssertToolbarControlGeometry(_singleStatus, DpiMetric(28), context);
            AssertToolbarControlGeometry(_leftStatus, DpiMetric(28), context);
            AssertToolbarControlGeometry(_rightStatus, DpiMetric(28), context);

            if (_workspaceState.Mode != WorkspaceMode.Dual || !_dualLayoutGroup.Visible)
                return;

            var safetyGap = DpiMetric(8);
            var leftEdge = _leftCommandGroup.Right + safetyGap;
            var rightEdge = _rightCommandGroup.Left - safetyGap;
            if (_dualLayoutGroup.Left < leftEdge || _dualLayoutGroup.Right > rightEdge)
            {
                throw new InvalidOperationException(
                    "Command Deck horizontal overlap/gap contract failed at " + context
                    + ": leftEdge=" + leftEdge
                    + " center=" + _dualLayoutGroup.Bounds
                    + " rightEdge=" + rightEdge + "."
                );
            }

            var desiredLeft = (_commandDeck.ClientSize.Width - _dualLayoutGroup.Width) / 2;
            if (desiredLeft >= leftEdge
                && desiredLeft + _dualLayoutGroup.Width <= rightEdge
                && Math.Abs(_dualLayoutGroup.Left - desiredLeft) > 1)
            {
                throw new InvalidOperationException(
                    "Command Deck center is not physically centered at " + context
                    + ": desired=" + desiredLeft
                    + " actual=" + _dualLayoutGroup.Left + "."
                );
            }

            if (_workspaceState.FocusMode)
            {
                var activeOnLeft = string.Equals(
                    _workspaceState.ActiveProfileId,
                    _workspaceState.LeftProfileId,
                    StringComparison.OrdinalIgnoreCase
                );
                var account = activeOnLeft ? _leftAccountButton : _rightAccountButton;
                var status = activeOnLeft ? _leftStatus : _rightStatus;
                if (!account.Visible
                    || !status.Visible
                    || !_focusButton.Visible
                    || !(account.Left < status.Left && status.Left < _focusButton.Left)
                    || !(account.TabIndex < _focusButton.TabIndex))
                {
                    throw new InvalidOperationException(
                        "Focus hierarchy must be account -> health -> Restore at " + context
                        + ": account=" + account.Bounds
                        + " status=" + status.Bounds
                        + " restore=" + _focusButton.Bounds
                        + " accountTab=" + account.TabIndex
                        + " restoreTab=" + _focusButton.TabIndex + "."
                    );
                }
            }
            else if (!_leftStatus.Visible || !_rightStatus.Visible)
            {
                throw new InvalidOperationException(
                    "Dual health labels must remain visible at " + context + "."
                );
            }
        }

        private void AssertToolbarGroupGeometry(
            FlowLayoutPanel group,
            string name,
            string context
        )
        {
            if (group == null || !group.Visible) return;
            if (group.Height < DpiMetric(32))
            {
                throw new InvalidOperationException(
                    "Command Deck " + name + " group is clipped at " + context
                    + ": " + group.Bounds + "."
                );
            }
        }

        private void AssertGameDockGeometry(string context)
        {
            if (_gameDock == null || _gameDockGroup == null || _gameDockProfileLabel == null)
                throw new InvalidOperationException("Game Dock is not initialized at " + context + ".");
            if (_rootLayout.RowCount != 3
                || _rootLayout.RowStyles.Count != 3
                || Math.Abs(_rootLayout.RowStyles[2].Height - DpiMetric(44)) > 0.1f
                || _gameDock.Top != _split.Bottom)
            {
                throw new InvalidOperationException(
                    "Three-row workspace seam regression at " + context
                    + ": root=" + _rootLayout.RowCount
                    + " row2=" + (_rootLayout.RowStyles.Count > 2 ? _rootLayout.RowStyles[2].Height : -1)
                    + " split=" + _split.Bounds
                    + " dock=" + _gameDock.Bounds + "."
                );
            }
            if (_gameDock.Height != DpiMetric(44))
                throw new InvalidOperationException(
                    "Game Dock height regression at " + context + ": " + _gameDock.Height
                    + " visible=" + _gameDock.Visible
                    + " root=" + _rootLayout.ClientSize
                    + " split=" + _split.Bounds
                    + " dock=" + _gameDock.Bounds + "."
                );
            if (_gameDockGroup.Height < DpiMetric(32))
                throw new InvalidOperationException(
                    "Game Dock group is clipped at " + context + ": " + _gameDockGroup.Bounds + "."
                );
            var edge = DpiMetric(8);
            if (_gameDockGroup.Left < edge
                || _gameDockGroup.Right > _gameDock.ClientSize.Width - edge)
            {
                throw new InvalidOperationException(
                    "Game Dock overflow at " + context
                    + ": group=" + _gameDockGroup.Bounds
                    + " dock=" + _gameDock.ClientSize + "."
                );
            }
            var dual = _workspaceState.Mode == WorkspaceMode.Dual;
            if (_gameDockProfileLabel.Visible == dual
                || _gameDockAccountButtons.Count != ProfileRegistry.All().Length)
                throw new InvalidOperationException("Game Dock account selector mode regression at " + context + ".");
            foreach (var profile in ProfileRegistry.All())
            {
                Button selector;
                if (!_gameDockAccountButtons.TryGetValue(profile.Id, out selector))
                    throw new InvalidOperationException("Missing Game Dock account selector at " + context + ".");
                var selected = string.Equals(profile.Id, _workspaceState.ActiveProfileId, StringComparison.OrdinalIgnoreCase);
                if (selector.Visible != dual
                    || selector.Enabled != dual
                    || !(selector.Tag is bool)
                    || (bool)selector.Tag != selected
                    || (dual && (selector.AccessibleName ?? "").IndexOf(
                        selected ? "Active account " : "Activate account ", StringComparison.Ordinal) != 0))
                {
                    throw new InvalidOperationException("Game Dock account state/accessible name regression at " + context + ".");
                }
                if (dual) AssertToolbarControlGeometry(selector, DpiMetric(28), "game-dock-account-" + context);
                if (dual && TextRenderer.MeasureText(
                    selector.Text, selector.Font, Size.Empty,
                    TextFormatFlags.NoPadding | TextFormatFlags.SingleLine
                ).Width > selector.Width - DpiMetric(12))
                    throw new InvalidOperationException("Game Dock account label is clipped at " + context + ".");
            }
            AssertToolbarControlGeometry(_gameDockProfileLabel, DpiMetric(28), "game-dock-" + context);
            if (_gameDockAvailabilityLabel != null && _gameDockAvailabilityLabel.Visible)
            {
                AssertToolbarControlGeometry(_gameDockAvailabilityLabel, DpiMetric(28), "game-dock-offline-" + context);
                if (TextRenderer.MeasureText(
                    _gameDockAvailabilityLabel.Text, _gameDockAvailabilityLabel.Font, Size.Empty,
                    TextFormatFlags.NoPadding | TextFormatFlags.SingleLine
                ).Width > _gameDockAvailabilityLabel.Width)
                    throw new InvalidOperationException("Game Dock offline label is clipped at " + context + ".");
            }
            foreach (var definition in GameDockQuickSurfaces)
            {
                Button button;
                if (_gameDockButtons.TryGetValue(definition.Key, out button))
                    AssertToolbarControlGeometry(button, DpiMetric(28), "game-dock-" + context);
            }
            if (_gameDockOverflowButton == null)
                throw new InvalidOperationException("Game Dock overflow button is missing at " + context + ".");
            AssertToolbarControlGeometry(
                _gameDockOverflowButton,
                DpiMetric(28),
                "game-dock-overflow-" + context
            );
        }

        private void AssertCardsModeShellGeometry(string context)
        {
            if (!AreAllVisibleProfilesCards())
                throw new InvalidOperationException("Cards shell was not active at " + context + ".");
            AssertGameDockGeometry(context);
        }

        private void AssertCurrentContentViewShellGeometry(string context)
        {
            AssertGameDockGeometry(context);
        }

        private static void AssertToolbarControlGeometry(
            Control control,
            int expectedHeight,
            string context
        )
        {
            if (control == null || !control.Visible) return;
            if (control.Height != expectedHeight)
            {
                throw new InvalidOperationException(
                    "Command Deck control height regression at " + context
                    + ": " + control.GetType().Name
                    + " height=" + control.Height + "."
                );
            }
            if (control.Parent != null
                && (control.Top < 0 || control.Bottom > control.Parent.ClientSize.Height))
            {
                throw new InvalidOperationException(
                    "Command Deck control is vertically clipped at " + context
                    + ": " + control.GetType().Name
                    + " bounds=" + control.Bounds
                    + " parent=" + control.Parent.ClientSize + "."
                );
            }
        }

        private void AssertHealthDeckTextFits()
        {
            foreach (PaneHealthState state in Enum.GetValues(typeof(PaneHealthState)))
            {
                var compact = HealthDeckText(state, false);
                var expanded = HealthDeckText(state, true);
                var compactWidth = TextRenderer.MeasureText(
                    compact,
                    Font,
                    Size.Empty,
                    TextFormatFlags.NoPadding | TextFormatFlags.SingleLine
                ).Width;
                var expandedWidth = TextRenderer.MeasureText(
                    expanded,
                    Font,
                    Size.Empty,
                    TextFormatFlags.NoPadding | TextFormatFlags.SingleLine
                ).Width;
                var compactReserved = DpiMetric(CompactStatusWidth);
                var expandedReserved = DpiMetric(ExpandedStatusWidth);
                if (compactWidth > compactReserved || expandedWidth > expandedReserved)
                {
                    throw new InvalidOperationException(
                        "Health deck text does not fit its reserved width: state=" + state
                        + " compact=" + compactWidth + "/" + compactReserved
                        + " expanded=" + expandedWidth + "/" + expandedReserved + "."
                    );
                }
            }
        }

        private void AssertBetterUiSelectContract()
        {
            var selects = new[] { _singleProfileSelector, _scopeSelector };
            foreach (var select in selects)
            {
                if (select == null
                    || select.Height != DpiMetric(28)
                    || !select.TabStop
                    || select.AccessibleRole != AccessibleRole.ComboBox
                    || select.BackColor.ToArgb() != WorkspaceChrome.Interactive.ToArgb())
                {
                    throw new InvalidOperationException("Better UI select base contract failed.");
                }
            }

            var originalIndex = _scopeSelector.SelectedIndex;
            var previousUpdating = _updatingCommandDeck;
            _updatingCommandDeck = true;
            try
            {
                _scopeSelector.SelectedIndex = 0;
                _scopeSelector.Focus();
                Application.DoEvents();
                if (!_scopeSelector.Focused)
                {
                    throw new InvalidOperationException(
                        "Better UI select could not receive keyboard focus for input smoke."
                    );
                }
                var down = Message.Create(
                    _scopeSelector.Handle,
                    0x0100,
                    new IntPtr((int)Keys.Down),
                    IntPtr.Zero
                );
                var handled = _scopeSelector.PreProcessMessage(ref down);
                var accessibleValue = _scopeSelector.AccessibilityObject.Value;
                if (!handled
                    || _scopeSelector.SelectedIndex != 1
                    || !string.Equals(
                        accessibleValue,
                        "Both",
                        StringComparison.Ordinal
                    ))
                {
                    throw new InvalidOperationException(
                        "Better UI select keyboard/accessibility value contract failed."
                        + " handled=" + handled
                        + " index=" + _scopeSelector.SelectedIndex
                        + " value=" + (accessibleValue ?? "<null>")
                        + "."
                    );
                }
                _scopeSelector.SelectedIndex = originalIndex;
            }
            finally
            {
                _updatingCommandDeck = previousUpdating;
            }
            UpdateCommandDeck();
        }

        private void CaptureBetterUiSelectPopupSmoke(string outputDir)
        {
            if ((_scopeSelector.AccessibilityObject.State & AccessibleStates.Collapsed) == 0)
            {
                throw new InvalidOperationException(
                    "Better UI select did not expose the collapsed accessibility state."
                );
            }

            var menu = _scopeSelector.MenuForSmoke;
            if (menu == null)
                throw new InvalidOperationException("Better UI select smoke menu is missing.");
            var opens = 0;
            ToolStripDropDownCloseReason? lastCloseReason = null;
            EventHandler onOpened = delegate { opens++; };
            ToolStripDropDownClosedEventHandler onClosed = delegate(
                object sender, ToolStripDropDownClosedEventArgs args)
            {
                lastCloseReason = args.CloseReason;
            };
            menu.Opened += onOpened;
            menu.Closed += onClosed;
            try
            {
                _scopeSelector.Focus();
                _scopeSelector.OpenMenuForSmoke();
                var openedBeforePump = menu.Visible;
                Application.DoEvents();

                // A synthetic offscreen WinForms smoke may receive an unrelated
                // activation/focus notification during DoEvents and auto-close a
                // menu which *was* visibly opened. Reopen ONCE only when the
                // precise native CloseReason proves that transient condition.
                // Never mask an inaccessible, empty, disposed or unopenable menu.
                var transientFocusClose = openedBeforePump
                    && !menu.Visible
                    && (lastCloseReason == ToolStripDropDownCloseReason.AppClicked
                        || lastCloseReason == ToolStripDropDownCloseReason.AppFocusChange)
                    && _scopeSelector.Enabled
                    && _scopeSelector.Visible
                    && _scopeSelector.CanFocus
                    && _scopeSelector.IsHandleCreated
                    && _scopeSelector.Items.Count > 0;
                if (transientFocusClose)
                {
                    _scopeSelector.Focus();
                    Application.DoEvents();
                    _scopeSelector.OpenMenuForSmoke();
                    Application.DoEvents();
                }

                if (!menu.Visible
                    || (_scopeSelector.AccessibilityObject.State & AccessibleStates.Expanded) == 0)
                {
                    throw new InvalidOperationException(
                        "Better UI select did not expose an open dropdown/accessibility state:"
                        + " openedBeforePump=" + openedBeforePump
                        + ", openedCount=" + opens
                        + ", lastCloseReason=" + (lastCloseReason.HasValue
                            ? lastCloseReason.Value.ToString() : "none")
                        + ", enabled=" + _scopeSelector.Enabled
                        + ", visible=" + _scopeSelector.Visible
                        + ", focused=" + _scopeSelector.Focused
                        + ", canFocus=" + _scopeSelector.CanFocus
                        + ", handleCreated=" + _scopeSelector.IsHandleCreated
                        + ", items=" + _scopeSelector.Items.Count + "."
                    );
                }

                menu.Location = new Point(-10000, -10000);
                Application.DoEvents();
                if (!menu.Visible
                    || (_scopeSelector.AccessibilityObject.State & AccessibleStates.Expanded) == 0)
                    throw new InvalidOperationException(
                        "Better UI select menu closed during screenshot preparation;"
                        + " lastCloseReason=" + (lastCloseReason.HasValue
                            ? lastCloseReason.Value.ToString() : "none") + "."
                    );
                CaptureControl(
                    menu,
                    Path.Combine(outputDir, "command-deck-scope-dropdown.png")
                );
            }
            finally
            {
                try
                {
                    if (menu.Visible) menu.Close(ToolStripDropDownCloseReason.CloseCalled);
                    Application.DoEvents();
                }
                finally
                {
                    menu.Opened -= onOpened;
                    menu.Closed -= onClosed;
                }
            }
            if ((_scopeSelector.AccessibilityObject.State & AccessibleStates.Collapsed) == 0)
            {
                throw new InvalidOperationException(
                    "Better UI select did not return to the collapsed accessibility state."
                );
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
            RunCommandDeckRegressionSmoke(outputDir);

            Width = DpiMetric(1600);
            PerformLayout();
            UpdateCommandDeck();
            Application.DoEvents();
            await CaptureLootSummarySmokeEvidenceAsync(outputDir);
            AssertCommandDeckGeometry("dual-1600");
            AssertCardsModeShellGeometry("cards-dual-1600");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Left), "cards-dual-1600-left");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Right), "cards-dual-1600-right");
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-dual-1600.png")
            );
            CaptureControl(
                _gameDock,
                Path.Combine(outputDir, "game-dock-dual-1600.png")
            );
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-dual-1600.png"),
                false
            );

            Width = DpiMetric(1180);
            Height = DpiMetric(600);
            PerformLayout();
            UpdateCommandDeck();
            Application.DoEvents();
            AssertCommandDeckGeometry("dual-1180");
            AssertCardsModeShellGeometry("cards-dual-1180");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Left), "cards-dual-1180-left");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Right), "cards-dual-1180-right");
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-dual-1180.png")
            );
            CaptureControl(
                _gameDock,
                Path.Combine(outputDir, "game-dock-dual-1180.png")
            );
            SetActiveProfile(ProfileRegistry.Rhyosa.Id);
            AssertGameDockGeometry("dual-1180-selected-rhyosa");
            CaptureControl(
                _gameDock,
                Path.Combine(outputDir, "game-dock-rhyosa-1180.png")
            );
            SetActiveProfile(ProfileRegistry.Rhyxus.Id);
            AssertGameDockGeometry("dual-1180-selected-rhyxus");
            CaptureGameDockOverflowVisualSmoke(outputDir);
            var offlinePane = GetPaneForProfile(_workspaceState.ActiveProfileId);
            offlinePane.ResetWorkspaceBridge();
            UpdateGameDock();
            AssertGameDockGeometry("dual-1180-offline");
            CaptureControl(
                _gameDock,
                Path.Combine(outputDir, "game-dock-offline-1180.png")
            );
            await RunGameDockOfflineBridgeSmokeAsync(offlinePane);
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-dual-1180.png"),
                false
            );
            await Task.WhenAll(
                ScrollVisualCardsToHistoryAsync(GetPaneForSide(PaneSide.Left)),
                ScrollVisualCardsToHistoryAsync(GetPaneForSide(PaneSide.Right))
            );
            await Task.Delay(40);
            Application.DoEvents();
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-history-dual-1180.png"),
                false
            );
            await Task.WhenAll(
                SetVisualStoryTabAsync(GetPaneForSide(PaneSide.Left), "loot"),
                SetVisualStoryTabAsync(GetPaneForSide(PaneSide.Right), "loot")
            );
            await Task.Delay(40);
            Application.DoEvents();
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-loot-dual-1180.png"),
                false
            );
            await Task.WhenAll(
                SetVisualStoryTabAsync(GetPaneForSide(PaneSide.Left), "hunt"),
                SetVisualStoryTabAsync(GetPaneForSide(PaneSide.Right), "hunt")
            );
            await Task.WhenAll(
                RestoreVisualCardsTopAsync(GetPaneForSide(PaneSide.Left)),
                RestoreVisualCardsTopAsync(GetPaneForSide(PaneSide.Right))
            );
            ApplyLayoutPreset(1.0 / 3.0);
            PerformLayout();
            UpdateCommandDeck();
            Application.DoEvents();
            AssertCardsModeShellGeometry("cards-dual-1-2-1180");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Left), "cards-dual-1-2-1180-left");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Right), "cards-dual-1-2-1180-right");
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-dual-1-2-1180.png"),
                false
            );
            await Task.WhenAll(
                ScrollVisualCardsToHistoryAsync(GetPaneForSide(PaneSide.Left)),
                ScrollVisualCardsToHistoryAsync(GetPaneForSide(PaneSide.Right))
            );
            await Task.Delay(40);
            Application.DoEvents();
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-history-dual-1-2-1180.png"),
                false
            );
            await CaptureNarrowHuntStoryEvidenceAsync(GetPaneForSide(PaneSide.Left), outputDir);
            await Task.WhenAll(
                RestoreVisualCardsTopAsync(GetPaneForSide(PaneSide.Left)),
                RestoreVisualCardsTopAsync(GetPaneForSide(PaneSide.Right))
            );
            ApplyLayoutPreset(2.0 / 3.0);
            PerformLayout();
            UpdateCommandDeck();
            Application.DoEvents();
            AssertCardsModeShellGeometry("cards-dual-2-1-1180");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Left), "cards-dual-2-1-1180-left");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Right), "cards-dual-2-1-1180-right");
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-dual-2-1-1180.png"),
                false
            );
            await Task.WhenAll(
                ScrollVisualCardsToHistoryAsync(GetPaneForSide(PaneSide.Left)),
                ScrollVisualCardsToHistoryAsync(GetPaneForSide(PaneSide.Right))
            );
            await Task.Delay(40);
            Application.DoEvents();
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-history-dual-2-1-1180.png"),
                false
            );
            await Task.WhenAll(
                RestoreVisualCardsTopAsync(GetPaneForSide(PaneSide.Left)),
                RestoreVisualCardsTopAsync(GetPaneForSide(PaneSide.Right))
            );
            ApplyLayoutPreset(0.5);
            PerformLayout();
            UpdateCommandDeck();
            Application.DoEvents();
            var focusedAccountButton = _gameDockAccountButtons[ProfileRegistry.Rhyxus.Id];
            focusedAccountButton.Focus();
            Application.DoEvents();
            UpdateGameDock();
            if (!focusedAccountButton.Focused
                || focusedAccountButton.FlatAppearance.BorderColor.ToArgb() != WorkspaceChrome.Focus.ToArgb()
                || focusedAccountButton.ForeColor.ToArgb() != WorkspaceChrome.Selected.ToArgb())
                throw new InvalidOperationException("Selected Game Dock account lost its independent keyboard focus cue.");
            CaptureControl(
                _gameDock,
                Path.Combine(outputDir, "game-dock-account-focus-1180.png")
            );
            var gameDockFocusButton = _gameDockButtons["hunts"];
            gameDockFocusButton.Focus();
            Application.DoEvents();
            UpdateGameDock();
            Application.DoEvents();
            if (!gameDockFocusButton.Focused
                || gameDockFocusButton.FlatAppearance.BorderColor.ToArgb()
                    != Color.FromArgb(0x54, 0xBA, 0xD2).ToArgb())
            {
                throw new InvalidOperationException(
                    "Game Dock keyboard focus cue did not use the cyan focus edge."
                );
            }
            CaptureControl(
                _gameDock,
                Path.Combine(outputDir, "game-dock-keyboard-focus-1180.png")
            );
            _leftAccountButton.Focus();
            Application.DoEvents();
            UpdateGameDock();
            CaptureControl(
                _rootLayout,
                Path.Combine(outputDir, "workspace-dual-1180.png")
            );
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-dual-composite-1180.png"),
                false
            );
            CaptureBetterUiSelectPopupSmoke(outputDir);

            _leftAccountButton.Focus();
            Application.DoEvents();
            UpdateCommandDeck();
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

            _scopeSelector.Focus();
            Application.DoEvents();
            _webViewFocusedProfileId = _workspaceState.LeftProfileId;
            UpdateCommandDeck();
            Application.DoEvents();
            if (_leftAccountButton.Focused
                || _leftAccountButton.FlatAppearance.BorderColor.ToArgb()
                    != Color.FromArgb(0x54, 0xBA, 0xD2).ToArgb()
                || _leftAccountButton.ForeColor.ToArgb()
                    != Color.FromArgb(0xE3, 0xC0, 0x54).ToArgb())
            {
                throw new InvalidOperationException(
                    "WebView focus cue did not remain independent from selected/current semantics."
                );
            }
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-webview-focus-1180.png")
            );
            _webViewFocusedProfileId = null;
            UpdateCommandDeck();

            await SwitchToSingleAsync(ProfileRegistry.Rhyxus.Id);
            PerformLayout();
            UpdateCommandDeck();
            Application.DoEvents();
            AssertCommandDeckGeometry("single-1180");
            AssertCardsModeShellGeometry("cards-single-1180");
            await AssertVisualCardDashboardAsync(
                GetPaneForProfile(_workspaceState.SingleProfileId),
                "cards-single-1180"
            );
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-single-1180.png")
            );
            CaptureControl(
                _gameDock,
                Path.Combine(outputDir, "game-dock-single-1180.png")
            );
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-single-1180.png"),
                false
            );

            await SwitchToDualAsync();
            await PrepareVisualSmokePagesAsync();
            SetActiveProfile(ProfileRegistry.Rhyxus.Id);
            EnterFocusMode();
            PerformLayout();
            UpdateCommandDeck();
            Application.DoEvents();
            AssertCommandDeckGeometry("focus-left-1180");
            AssertCardsModeShellGeometry("cards-focus-left-1180");
            await WaitForVisualCardDashboardAsync(GetPaneForProfile(_workspaceState.ActiveProfileId));
            await AssertVisualCardDashboardAsync(
                GetPaneForProfile(_workspaceState.ActiveProfileId),
                "cards-focus-left-1180"
            );
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-focus-left-1180.png")
            );
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-focus-left-1180.png"),
                false
            );
            RestoreFocusMode();

            SetActiveProfile(ProfileRegistry.Rhyosa.Id);
            EnterFocusMode();
            PerformLayout();
            UpdateCommandDeck();
            Application.DoEvents();
            AssertCommandDeckGeometry("focus-right-1180");
            AssertCardsModeShellGeometry("cards-focus-right-1180");
            await WaitForVisualCardDashboardAsync(GetPaneForProfile(_workspaceState.ActiveProfileId));
            await AssertVisualCardDashboardAsync(
                GetPaneForProfile(_workspaceState.ActiveProfileId),
                "cards-focus-right-1180"
            );
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-focus-1180.png")
            );
            CaptureControl(
                _gameDock,
                Path.Combine(outputDir, "game-dock-focus-right-1180.png")
            );
            CaptureControl(
                _commandDeck,
                Path.Combine(outputDir, "command-deck-focus-right-1180.png")
            );
            CaptureControl(
                _rootLayout,
                Path.Combine(outputDir, "workspace-focus-1180.png")
            );
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-focus-right-1180.png"),
                false
            );
            RestoreFocusMode();

            SetActiveProfile(ProfileRegistry.Rhyxus.Id);
            ApplyLayoutPreset(0.5);
            SetContentView(ProfileRegistry.Rhyxus.Id, false);
            SetContentView(ProfileRegistry.Rhyosa.Id, false);
            await Task.Delay(40);
            Application.DoEvents();
            AssertGameDockGeometry("game-dual-1180");
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-game-dual-1180.png"),
                false
            );
            SetContentView(ProfileRegistry.Rhyxus.Id, true);
            await Task.Delay(40);
            Application.DoEvents();
            if (!GetPaneForProfile(ProfileRegistry.Rhyxus.Id).CardsViewActive
                || GetPaneForProfile(ProfileRegistry.Rhyosa.Id).CardsViewActive)
            {
                throw new InvalidOperationException("Mixed Cards/Game visual smoke lost its profile-owned view selection.");
            }
            AssertCurrentContentViewShellGeometry("mixed-cards-game-1180");
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-mixed-cards-game-1180.png"),
                false
            );
            SetContentView(ProfileRegistry.Rhyosa.Id, true);
            await Task.Delay(40);
            Application.DoEvents();
            AssertCardsModeShellGeometry("cards-restored-after-game-1180");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Left), "cards-restored-left");
            await AssertVisualCardDashboardAsync(GetPaneForSide(PaneSide.Right), "cards-restored-right");
            // The general dashboard smoke above deliberately holds one live Hunt
            // target. Capture the distinct CURRENT-only presentation states in
            // an isolated, synthetic local page before the maintenance drawer.
            await CaptureCurrentLifecycleVisualEvidenceAsync(outputDir);

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
            RunMaintenanceDrawerPreferencesSmoke(outputDir);
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
            Application.DoEvents();
        }

        // Synthetic-only presentation matrix for the allowlisted CURRENT
        // contract. It runs after the original 51-state visual baseline and
        // never accesses a PokePixel origin or a real user profile.
        private async Task CaptureCurrentLifecycleVisualEvidenceAsync(string outputDir)
        {
            var pane = GetPaneForSide(PaneSide.Left);
            if (pane == null || pane.View == null || pane.View.CoreWebView2 == null
                || !pane.CardsViewActive)
                throw new InvalidOperationException("CURRENT visual fixture requires a synthetic Cards pane.");

            ApplyLayoutPreset(0.5);
            PerformLayout();
            Application.DoEvents();
            var previousLeftMin = _split.Panel1MinSize;
            var previousSplitterDistance = _split.SplitterDistance;
            // The ordinary host keeps at least 320px per pane. The 235px
            // diagnostic temporarily narrows only this disposable smoke pane
            // so CSS viewport breakpoints, not merely a root width override,
            // are actually exercised. Never save this synthetic split.
            _split.Panel1MinSize = DpiMetric(200);
            var scenarios = new[] {
                "cold-hunt", "live-hunt", "between-hunt", "paused-hunt",
                "ended-hunt", "expedition-running", "expedition-paused",
                "expedition-ended", "new-hunt", "unavailable"
            };
            // Cover both sides of the 319/320 and 519/520 CSS reflow edges.
            var widths = new[] { 235, 269, 270, 319, 320, 390, 519, 520 };
            foreach (var scenario in scenarios)
            {
                foreach (var width in widths)
                {
                    _applyingLayout = true;
                    try { _split.SplitterDistance = DpiMetric(width); }
                    finally { _applyingLayout = false; }
                    PerformLayout();
                    Application.DoEvents();
                    var script = "(function(){"
                        + "var root=document.querySelector('[data-ppbui-coupled-cards]');"
                        + "if(!root||typeof window.__cwVisualSetCurrent!=='function')return false;"
                        + "root.style.removeProperty('width');root.style.removeProperty('right');root.scrollTop=0;"
                        + "window.PokeIdle.Localization.get=function(){return 'pt-BR';};"
                        + "if(!window.__cwVisualSetCurrent(" + QuoteJs(scenario) + "))return false;"
                        + "var adapter=document[Symbol.for('ppbui.coupled.active-adapter')];"
                        + "if(!adapter||typeof adapter.sync!=='function')return false;adapter.sync();return true;})()";
                    var prepared = await pane.View.CoreWebView2.ExecuteScriptAsync(script);
                    if (!string.Equals(prepared, "true", StringComparison.Ordinal))
                        throw new InvalidOperationException("Could not prepare CURRENT synthetic state " + scenario + " at " + width + "px.");

                    await Task.Delay(90);
                    Application.DoEvents();
                    var expectedName = scenario == "expedition-running" ? "EXPEDITION"
                        : scenario == "unavailable" ? "Indisponível"
                        : scenario == "new-hunt" ? "Aguardando alvo"
                        : scenario == "live-hunt" ? "Charizard"
                        : scenario.StartsWith("expedition-", StringComparison.Ordinal) ? "Gyarados"
                        : "Dragonite";
                    var expectedKicker = scenario == "cold-hunt" || scenario == "between-hunt"
                        || scenario == "paused-hunt" || scenario == "ended-hunt"
                        ? "\u00daLTIMO DA HUNT"
                        : scenario == "expedition-paused" || scenario == "expedition-ended"
                            ? "\u00daLTIMO DA EXP." : "ALVO";
                    var expectedNoRarity = scenario != "live-hunt";
                    var verification = "(function(){"
                        + "var root=document.querySelector('[data-ppbui-coupled-cards]');"
                        + "var name=root&&root.querySelector('[data-card-field=target-name]');"
                        + "var kicker=root&&root.querySelector('[data-card-copy=target]');"
                        + "var rarity=root&&root.querySelector('[data-card-target-rarity]');"
                        + "var shiny=root&&root.querySelector('[data-card-shiny-badge]');"
                        + "var target=root&&root.querySelector('[data-card-combat=target]');"
                        + "var team=root&&root.querySelector('.ppbui-cards-team-switch');"
                        + "var player=root&&root.querySelector('[data-card-combat=player]');"
                        + "var meta=root&&root.querySelector('[data-card-field=target-meta]');"
                        + "if(!root||root.hidden||!name||!kicker||!rarity||!shiny||!target||!team||!player||!meta)return false;"
                        + "var rootBounds=root.getBoundingClientRect();var nameBounds=name.getBoundingClientRect();"
                        + "var teamBounds=team.getBoundingClientRect();var playerBounds=player.getBoundingClientRect();"
                        + "var targetBounds=target.getBoundingClientRect();"
                        + "function wrapsWithin(el,bounds){var range=document.createRange();range.selectNodeContents(el);"
                        + "return Array.from(range.getClientRects()).every(function(r){return r.left>=bounds.left-1&&r.right<=bounds.right+1&&r.top>=bounds.top-1&&r.bottom<=bounds.bottom+1;});}"
                        + "var layout=" + width + "<=319?teamBounds.bottom<=playerBounds.top+2&&playerBounds.bottom<=targetBounds.top+2:"
                        + width + "<=519?teamBounds.bottom<=playerBounds.top+2&&Math.abs(playerBounds.top-targetBounds.top)<3:"
                        + "Math.abs(teamBounds.top-playerBounds.top)<3&&Math.abs(playerBounds.top-targetBounds.top)<3;"
                        + "return name.textContent.trim()===" + QuoteJs(expectedName)
                        + "&&kicker.textContent.trim()===" + QuoteJs(expectedKicker)
                        + "&&rarity.hidden===" + (expectedNoRarity ? "true" : "false")
                        + "&&shiny.hidden===" + (expectedNoRarity ? "true" : "false")
                        + "&&target.dataset.shiny===" + QuoteJs(expectedNoRarity ? "false" : "true")
                        + "&&Math.abs(rootBounds.width-" + width + ")<5"
                        + "&&nameBounds.left>=rootBounds.left-1&&nameBounds.right<=rootBounds.right+1"
                        + "&&layout&&root.scrollWidth<=root.clientWidth+" + (width < 320 ? "5" : "1")
                        + "&&document.body.scrollWidth<=document.body.clientWidth+1"
                        + "&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"
                        + "&&wrapsWithin(name,targetBounds)&&wrapsWithin(kicker,targetBounds)"
                        + "&&wrapsWithin(meta,targetBounds);})()";
                    var verified = await pane.View.CoreWebView2.ExecuteScriptAsync(verification);
                    if (!string.Equals(verified, "true", StringComparison.Ordinal))
                    {
                        var diagnosis = await pane.View.CoreWebView2.ExecuteScriptAsync(
                            "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                            + "if(!root)return 'missing root';var name=root.querySelector('[data-card-field=target-name]');"
                            + "var kicker=root.querySelector('[data-card-copy=target]');"
                            + "var rarity=root.querySelector('[data-card-target-rarity]');"
                            + "var shiny=root.querySelector('[data-card-shiny-badge]');"
                            + "var target=root.querySelector('[data-card-combat=target]');"
                            + "var team=root.querySelector('.ppbui-cards-team-switch');"
                            + "var player=root.querySelector('[data-card-combat=player]');"
                            + "var meta=root.querySelector('[data-card-field=target-meta]');"
                            + "function b(el){if(!el)return null;var r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}"
                            + "function full(el){if(!el||!target)return null;var bounds=target.getBoundingClientRect();"
                            + "var range=document.createRange();range.selectNodeContents(el);"
                            + "return Array.from(range.getClientRects()).every(function(r){return r.left>=bounds.left-1&&r.right<=bounds.right+1&&r.top>=bounds.top-1&&r.bottom<=bounds.bottom+1;});}"
                            + "return JSON.stringify({name:name&&name.textContent,kicker:kicker&&kicker.textContent,"
                            + "rarityHidden:rarity&&rarity.hidden,shinyHidden:shiny&&shiny.hidden,"
                            + "targetShiny:target&&target.dataset.shiny,width:root.getBoundingClientRect().width,viewport:innerWidth,"
                            + "rootScroll:[root.scrollWidth,root.clientWidth],bodyScroll:[document.body.scrollWidth,document.body.clientWidth],"
                            + "docScroll:[document.documentElement.scrollWidth,document.documentElement.clientWidth],"
                            + "team:b(team),player:b(player),target:b(target),name:b(name),kicker:b(kicker),meta:b(meta),"
                            + "nameFull:full(name),kickerFull:full(kicker),metaFull:full(meta)});})()"
                        );
                        throw new InvalidOperationException("CURRENT synthetic Cards data/geometry failed: "
                            + scenario + " " + width + "px, diagnostic=" + diagnosis + ".");
                    }
                    await CaptureWorkspaceCompositeAsync(
                        Path.Combine(outputDir, "workspace-current-" + scenario + "-ptbr-" + width + ".png"), false
                    );
                }
            }
            var restored = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                + "if(!root)return false;root.style.removeProperty('width');root.style.removeProperty('right');"
                + "window.PokeIdle.Localization.get=function(){return 'en-US';};"
                + "window.__cwVisualSetCurrent('live-hunt');"
                + "document[Symbol.for('ppbui.coupled.active-adapter')].sync();return true;})()"
            );
            if (!string.Equals(restored, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("CURRENT fixture could not restore original synthetic Cards state.");
            _split.Panel1MinSize = previousLeftMin;
            _applyingLayout = true;
            try { _split.SplitterDistance = previousSplitterDistance; }
            finally { _applyingLayout = false; }
            PerformLayout();
        }

        private void CaptureGameDockOverflowVisualSmoke(string outputDir)
        {
            var profileId = _workspaceState.ActiveProfileId;
            var pane = GetPaneForProfile(profileId);
            if (pane == null || _gameDockOverflowButton == null
                || !_gameDockOverflowButton.Enabled || _gameDockOverflowMenu == null
                || FindGameDockOverflowItem("hunt-analyzer") == null)
                throw new InvalidOperationException("Synthetic Overflow visual setup is not ready.");

            var originalQuick = _workspaceState.QuickSurfacesByProfile[profileId];
            var analyzerAvailable = pane.AvailableSurfaces.Contains("hunt-analyzer");
            try
            {
                ShowGameDockOverflowMenu();
                Application.DoEvents();
                if (!_gameDockOverflowMenu.Visible)
                    throw new InvalidOperationException("Synthetic Overflow popup did not open.");
                var retainedItem = FindGameDockOverflowItem("hunt-analyzer");
                CaptureGameDockOverflowFrame(Path.Combine(outputDir, "game-dock-overflow-open-1180.png"));
                CaptureControl(_gameDockOverflowMenu,
                    Path.Combine(outputDir, "game-dock-overflow-menu-1180.png"));

                UpdateGameDock();
                if (!_gameDockOverflowMenu.Visible
                    || !object.ReferenceEquals(retainedItem, FindGameDockOverflowItem("hunt-analyzer")))
                    throw new InvalidOperationException("Unchanged synthetic Overflow menu was replaced.");

                var reordered = new List<string>(originalQuick);
                var first = reordered[0];
                reordered[0] = reordered[1];
                reordered[1] = first;
                _workspaceState.QuickSurfacesByProfile[profileId] = reordered;
                UpdateGameDock();
                if (!_gameDockOverflowMenu.Visible
                    || !object.ReferenceEquals(retainedItem, FindGameDockOverflowItem("hunt-analyzer")))
                    throw new InvalidOperationException("Quick reorder closed the unchanged synthetic Overflow popup.");
                CaptureGameDockOverflowFrame(Path.Combine(outputDir, "game-dock-overflow-reordered-1180.png"));

                pane.AvailableSurfaces.Remove("hunt-analyzer");
                UpdateGameDock();
                if (_gameDockOverflowMenu.Visible || FindGameDockOverflowItem("hunt-analyzer") != null)
                    throw new InvalidOperationException("Revoked synthetic Overflow surface stayed visible.");
                CaptureControl(_gameDock,
                    Path.Combine(outputDir, "game-dock-overflow-revoked-1180.png"));
            }
            finally
            {
                _workspaceState.QuickSurfacesByProfile[profileId] = originalQuick;
                if (analyzerAvailable) pane.AvailableSurfaces.Add("hunt-analyzer");
                if (_gameDockOverflowMenu.Visible)
                    _gameDockOverflowMenu.Close(ToolStripDropDownCloseReason.CloseCalled);
                UpdateGameDock();
            }
        }

        private void CaptureGameDockOverflowFrame(string path)
        {
            if (!_gameDockOverflowMenu.Visible || _gameDockOverflowMenu.Width <= 0
                || _gameDockOverflowMenu.Height <= 0)
                throw new InvalidOperationException("Cannot capture a closed synthetic Overflow popup.");
            var dockBounds = _gameDock.RectangleToScreen(_gameDock.ClientRectangle);
            var menuBounds = _gameDockOverflowMenu.Bounds;
            var buttonTop = _gameDockOverflowButton.RectangleToScreen(
                _gameDockOverflowButton.ClientRectangle).Top;
            var workingArea = Screen.FromControl(_gameDockOverflowButton).WorkingArea;
            if (menuBounds.Bottom > buttonTop + DpiMetric(2)
                || !workingArea.Contains(menuBounds)
                || menuBounds.Width > DpiMetric(320) + DpiMetric(4))
                throw new InvalidOperationException("Synthetic Overflow popup is clipped or misplaced.");

            var bounds = Rectangle.Union(dockBounds, menuBounds);
            using (var bitmap = new Bitmap(bounds.Width, bounds.Height))
            using (var dockImage = new Bitmap(_gameDock.Width, _gameDock.Height))
            using (var menuImage = new Bitmap(menuBounds.Width, menuBounds.Height))
            {
                _gameDock.DrawToBitmap(dockImage,
                    new Rectangle(Point.Empty, dockImage.Size));
                _gameDockOverflowMenu.DrawToBitmap(menuImage,
                    new Rectangle(Point.Empty, menuImage.Size));
                using (var graphics = Graphics.FromImage(bitmap))
                {
                    graphics.Clear(BackColor);
                    graphics.DrawImageUnscaled(dockImage,
                        dockBounds.Left - bounds.Left, dockBounds.Top - bounds.Top);
                    graphics.DrawImageUnscaled(menuImage,
                        menuBounds.Left - bounds.Left, menuBounds.Top - bounds.Top);
                }
                bitmap.Save(path, System.Drawing.Imaging.ImageFormat.Png);
            }
        }

        private void RunMaintenanceDrawerPreferencesSmoke(string outputDir)
        {
            if (_drawerQuickSelectors.Count != GameDockQuickSurfaces.Length
                || _drawerZoomSelector == null || _drawerZoomResetButton == null
                || _drawerAccountsLabel == null || _drawerEditQuickButton == null
                || _maintenanceDrawerBody == null)
                throw new InvalidOperationException("Maintenance drawer preferences were not initialized.");

            var profileId = _workspaceState.ActiveProfileId;
            var originalFavorites = new List<string>(GetQuickGameDockSurfaces(profileId));
            var originalZoom = _workspaceState.ZoomByProfile[profileId];
            var pane = GetPaneForProfile(profileId);
            try
            {
                if (_drawerAccountsLabel.Text.IndexOf("Rhyxus:", StringComparison.Ordinal) < 0
                    || _drawerAccountsLabel.Text.IndexOf("Rhyosa:", StringComparison.Ordinal) < 0)
                    throw new InvalidOperationException("Read-only two-account diagnostics are missing.");
                if (_drawerZoomSelector.Items.Count != WorkspaceZoomPresets.Factors.Length
                    || _drawerZoomSelector.AccessibilityObject.Role != AccessibleRole.ComboBox
                    || !_drawerZoomSelector.TabStop
                    || _drawerZoomSelector.AccessibleName.IndexOf(
                        ProfileRegistry.Get(profileId).DisplayName, StringComparison.Ordinal
                    ) < 0)
                    throw new InvalidOperationException("Active-account zoom selector is inaccessible.");

                _maintenanceDrawerBody.ScrollControlIntoView(_drawerAccountsLabel);
                Application.DoEvents();
                CaptureControl(_maintenanceDrawerSurface,
                    Path.Combine(outputDir, "maintenance-drawer-health-zoom.png"));

                _drawerEditQuickButton.PerformClick();
                if (!_drawerQuickEditor.Visible)
                    throw new InvalidOperationException("Game Dock shortcut editor did not expand.");
                foreach (var selector in _drawerQuickSelectors)
                {
                    if (selector.Items.Count != GameDockAllSurfaces.Length
                        || !(selector is BetterUiSelect)
                        || selector.AccessibilityObject.Role != AccessibleRole.ComboBox
                        || !selector.TabStop
                        || string.IsNullOrWhiteSpace(selector.AccessibleName))
                        throw new InvalidOperationException("Game Dock shortcut controls are incomplete.");
                }

                var firstSelector = _drawerQuickSelectors[0];
                firstSelector.Focus();
                Application.DoEvents();
                if (!firstSelector.Focused)
                    throw new InvalidOperationException("Shortcut editor could not receive keyboard focus.");
                var closeReason = "none";
                firstSelector.MenuForSmoke.Closed += delegate(object sender, ToolStripDropDownClosedEventArgs args)
                { closeReason = args.CloseReason.ToString(); };
                firstSelector.OpenMenuForSmoke();
                if (!firstSelector.MenuForSmoke.Visible
                    || firstSelector.MenuForSmoke.Items.Count != GameDockAllSurfaces.Length
                    || firstSelector.MenuForSmoke.Height > DrawerDpiMetric(320) + DrawerDpiMetric(4))
                    throw new InvalidOperationException("Dark shortcut dropdown did not open a bounded native-menu list: visible="
                        + firstSelector.MenuForSmoke.Visible
                        + " items=" + firstSelector.MenuForSmoke.Items.Count
                        + " height=" + firstSelector.MenuForSmoke.Height
                        + " bound=" + (DrawerDpiMetric(320) + DrawerDpiMetric(4))
                        + " parent=" + firstSelector.Visible
                        + " drawer=" + _maintenanceDrawer.Visible
                        + " close=" + closeReason + ".");
                using (var dropdownImage = new Bitmap(
                    firstSelector.MenuForSmoke.Width, firstSelector.MenuForSmoke.Height))
                {
                    firstSelector.MenuForSmoke.DrawToBitmap(dropdownImage,
                        new Rectangle(Point.Empty, dropdownImage.Size));
                    dropdownImage.Save(Path.Combine(outputDir, "maintenance-shortcut-dropdown.png"),
                        System.Drawing.Imaging.ImageFormat.Png);
                }
                firstSelector.MenuForSmoke.Close(ToolStripDropDownCloseReason.CloseCalled);
                firstSelector.Focus();
                for (var i = 0; i < firstSelector.Items.Count; i++)
                {
                    var choice = firstSelector.Items[i] as QuickSurfaceChoice;
                    if (choice == null || choice.Id != "hunt-analyzer") continue;
                    firstSelector.SelectedIndex = i;
                    break;
                }
                if (GetQuickGameDockSurfaces(profileId)[0] != "hunt-analyzer"
                    || !_gameDockButtons.ContainsKey("hunt-analyzer")
                    || _drawerQuickSelectors[0].SelectedItem == null)
                    throw new InvalidOperationException("Shortcut editor did not update profile-owned buttons.");

                _drawerZoomSelector.SelectedIndex = 2;
                if (Math.Abs(_workspaceState.ZoomByProfile[profileId] - 1.10) > 0.001
                    || pane == null || Math.Abs(pane.View.ZoomFactor - 1.10) > 0.001)
                    throw new InvalidOperationException("Zoom selector did not update active WebView2.");
                _drawerZoomResetButton.PerformClick();
                if (Math.Abs(_workspaceState.ZoomByProfile[profileId] - 1.00) > 0.001
                    || Math.Abs(pane.View.ZoomFactor - 1.00) > 0.001)
                    throw new InvalidOperationException("Zoom reset did not restore active WebView2.");

                _maintenanceDrawerBody.ScrollControlIntoView(_drawerQuickSelectors[3]);
                Application.DoEvents();
                CaptureControl(_maintenanceDrawerSurface,
                    Path.Combine(outputDir, "maintenance-drawer-shortcuts-expanded.png"));
            }
            finally
            {
                _workspaceState.QuickSurfacesByProfile[profileId] = originalFavorites;
                _workspaceState.ZoomByProfile[profileId] = originalZoom;
                TryApplyPaneZoom(pane);
                _drawerQuickEditor.Visible = false;
                _drawerEditQuickButton.Text = "Edit 7 shortcuts";
                UpdateGameDock();
                RefreshMaintenanceDrawer();
            }
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

            var drawer = _maintenanceDrawer as MaintenanceDrawerForm;
            if (drawer == null)
                throw new InvalidOperationException("Maintenance drawer must use its dialog-key handler.");
            _drawerResetLayoutButton.Focus();
            Application.DoEvents();
            if (!_drawerResetLayoutButton.Focused)
                throw new InvalidOperationException("Maintenance drawer reset control did not receive focus.");

            // Record the actual child-message route in this synthetic smoke;
            // a direct form-level dialog-key call alone would not prove it.
            var originalHandler = drawer.DialogKeyHandler;
            var handlerCalled = false;
            var resetFocusedInHandler = false;
            var handledInHandler = false;
            var keyInHandler = Keys.None;
            var resetFocusedBefore = _drawerResetLayoutButton.Focused;
            bool tabHandled;
            try
            {
                drawer.DialogKeyHandler = delegate(Keys keyData)
                {
                    handlerCalled = true;
                    keyInHandler = keyData;
                    resetFocusedInHandler = _drawerResetLayoutButton.Focused;
                    handledInHandler = originalHandler != null && originalHandler(keyData);
                    return handledInHandler;
                };
                var tabMessage = Message.Create(
                    _drawerResetLayoutButton.Handle,
                    0x0100,
                    new IntPtr((int)Keys.Tab),
                    IntPtr.Zero
                );
                tabHandled = _drawerResetLayoutButton.PreProcessMessage(ref tabMessage);
                Application.DoEvents();
                if (!tabHandled
                    || !handlerCalled
                    || !handledInHandler
                    || !resetFocusedInHandler
                    || (keyInHandler & Keys.KeyCode) != Keys.Tab
                    || (keyInHandler & Keys.Shift) != Keys.None
                    || _maintenanceDrawer.Visible
                    || _maintenanceDrawer.ContainsFocus)
                {
                    throw new InvalidOperationException(
                        "Maintenance drawer forward Tab boundary did not exit the drawer:"
                        + " preProcessHandled=" + tabHandled
                        + " handlerCalled=" + handlerCalled
                        + " handlerKey=" + keyInHandler
                        + " handlerHandled=" + handledInHandler
                        + " resetFocusedBefore=" + resetFocusedBefore
                        + " resetFocusedInHandler=" + resetFocusedInHandler
                        + " resetFocusedAfter=" + _drawerResetLayoutButton.Focused
                        + " drawerVisible=" + _maintenanceDrawer.Visible
                        + " drawerContainsFocus=" + _maintenanceDrawer.ContainsFocus
                        + " hostActiveControl=" + (ActiveControl == null
                            ? "none" : ActiveControl.GetType().Name) + "."
                    );
                }
            }
            finally
            {
                drawer.DialogKeyHandler = originalHandler;
            }

            _maintenanceDrawer.Location = new Point(-10000, -10000);
            _maintenanceDrawer.Show(this);
            _drawerRecoverButton.Focus();
            Application.DoEvents();
            if (!_drawerRecoverButton.Focused)
                throw new InvalidOperationException("Maintenance drawer recover control did not receive focus.");

            if (!drawer.ProcessDialogKeyForSmoke(Keys.Tab | Keys.Shift))
            {
                throw new InvalidOperationException("Maintenance drawer Shift+Tab boundary was not handled as a dialog key.");
            }
            Application.DoEvents();
            if (_maintenanceDrawer.Visible)
                throw new InvalidOperationException("Maintenance drawer Shift+Tab boundary did not exit the drawer.");

            _maintenanceDrawer.Show(this);
            _drawerResetLayoutButton.Focus();
            Application.DoEvents();
            if (!_drawerResetLayoutButton.Focused
                || !drawer.ProcessDialogKeyForSmoke(Keys.Tab))
                throw new InvalidOperationException("Maintenance drawer direct forward Tab handler was not reached.");
            Application.DoEvents();
            if (_maintenanceDrawer.Visible || _maintenanceDrawer.ContainsFocus)
                throw new InvalidOperationException("Maintenance drawer direct forward Tab did not release keyboard focus.");
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

            SetContentView(ProfileRegistry.Rhyxus.Id, true);
            SetContentView(ProfileRegistry.Rhyosa.Id, true);

            await Task.WhenAll(
                NavigateSmokePaneAsync(left, new Uri(leftPath).AbsoluteUri),
                NavigateSmokePaneAsync(right, new Uri(rightPath).AbsoluteUri)
            );
            await Task.WhenAll(
                InstallVisualCardDashboardAsync(left),
                InstallVisualCardDashboardAsync(right)
            );
            await Task.WhenAll(
                WaitForVisualCardDashboardAsync(left),
                WaitForVisualCardDashboardAsync(right)
            );
            var handshakeReady = false;
            for (var attempt = 0; attempt < 40; attempt++)
            {
                Application.DoEvents();
                if (left.WorkspaceBridgeReady && right.WorkspaceBridgeReady)
                {
                    handshakeReady = true;
                    break;
                }
                await Task.Delay(50);
            }
            if (!handshakeReady)
            {
                throw new InvalidOperationException(
                    "Visual smoke bridge handshake did not settle after navigation:"
                    + " leftBridge=" + left.WorkspaceBridgeReady
                    + " rightBridge=" + right.WorkspaceBridgeReady + "."
                );
            }
            UpdateCommandDeck();
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
                + "<nav class=\"pokeidle-top-toolbar\">"
                + "<button data-menu-id=\"inventory\">Inventory</button>"
                + "<button data-menu-id=\"hunts\">Hunts</button>"
                + "<button data-menu-id=\"hunt-analyzer\">Hunt Analyzer</button>"
                + "<button data-menu-id=\"team\">Team</button>"
                + "<button data-menu-id=\"storage\">Storage</button>"
                + "<button data-menu-id=\"auto-helper\">Auto Helper</button>"
                + "<button data-menu-id=\"settings\">Settings</button>"
                + "</nav>"
                + "<div class=\"pokeidle-team-hud\"><div class=\"pokeidle-team-hud__active\"><div class=\"pokeidle-team-hud__active-portrait\"><canvas class=\"pokeidle-team-card__charset\" width=\"48\" height=\"48\"></canvas></div></div><div class=\"pokeidle-team-card\" data-creature-id=\"visual-player\"><canvas class=\"pokeidle-team-card__charset\" width=\"48\" height=\"48\"></canvas>"
                + "<span class=\"pokeidle-team-card__name\">" + profileName + " ACTIVE</span>"
                + "</div></div>"
                + "<div class=\"frame\"><div class=\"name\">" + profileName + "</div>"
                + "<div class=\"context\">" + context + "</div></div></body></html>";
        }

        private async Task InstallVisualCardDashboardAsync(AccountPane pane)
        {
            if (pane == null || pane.View == null || pane.View.CoreWebView2 == null)
                throw new InvalidOperationException("Visual card dashboard pane is unavailable.");
            if (_betterUiScript == null) _betterUiScript = LoadBetterUiScript();
            var isRhyxus = string.Equals(
                pane.Profile.Id,
                ProfileRegistry.Rhyxus.Id,
                StringComparison.OrdinalIgnoreCase
            );
            var playerName = isRhyxus ? "Rhydon" : "Gyarados";
            var playerSpeciesId = isRhyxus ? "rhydon" : "gyarados";
            var playerLevel = isRhyxus ? 195 : 183;
            var playerHp = isRhyxus ? 4603 : 3891;
            var playerMaxHp = isRhyxus ? 4603 : 4210;
            var targetName = isRhyxus ? "Charizard" : "Dragonite";
            var targetSpeciesId = isRhyxus ? "charizard" : "dragonite";
            var targetLevel = isRhyxus ? 90 : 88;
            var playerPortraitDraw = isRhyxus
                ? "ctx.clearRect(0,0,48,48);"
                  + "ctx.fillStyle='#161920';ctx.fillRect(0,0,48,48);"
                  + "ctx.fillStyle='#667487';ctx.fillRect(15,10,19,13);ctx.fillRect(12,20,25,17);ctx.fillRect(9,25,7,8);ctx.fillRect(34,23,7,7);ctx.fillRect(14,36,8,8);ctx.fillRect(29,36,8,8);"
                  + "ctx.fillStyle='#8997a8';ctx.fillRect(18,12,13,8);ctx.fillRect(18,24,15,10);ctx.fillRect(13,27,4,5);"
                  + "ctx.fillStyle='#3c4655';ctx.fillRect(12,21,5,6);ctx.fillRect(33,20,5,8);ctx.fillRect(15,35,7,3);ctx.fillRect(29,35,7,3);"
                  + "ctx.fillStyle='#d9c69b';ctx.fillRect(22,4,5,7);ctx.fillRect(23,2,3,4);ctx.fillRect(17,8,4,4);ctx.fillRect(30,8,4,4);"
                  + "ctx.fillStyle='#f0e3bd';ctx.fillRect(23,1,2,3);"
                  + "ctx.fillStyle='#d84a4a';ctx.fillRect(20,14,3,3);ctx.fillRect(28,14,3,3);"
                  + "ctx.fillStyle='#20242d';ctx.fillRect(21,15,1,1);ctx.fillRect(29,15,1,1);ctx.fillRect(22,19,7,2);"
                  + "ctx.fillStyle='#506074';ctx.fillRect(37,29,5,4);ctx.fillRect(40,31,5,3);"
                : "ctx.clearRect(0,0,48,48);";
            var setup = BuildCoupledWorkspaceBootstrapStatement()
                + "(function(){"
                + "var hud=document.querySelector('.pokeidle-team-hud');"
                + "var canvas=hud.querySelector('.pokeidle-team-hud__active-portrait canvas');canvas.width=48;canvas.height=48;"
                + "var ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;"
                + playerPortraitDraw
                + "var compactCanvas=hud.querySelector('.pokeidle-team-card[data-creature-id=\"visual-player\"] canvas');compactCanvas.width=48;compactCanvas.height=48;compactCanvas.getContext('2d').clearRect(0,0,48,48);"
                + "function nativeSprite(base,accent){var c=document.createElement('canvas');c.width=48;c.height=48;var x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,48,48);x.fillStyle=base;x.fillRect(12,8,24,30);x.fillRect(7,16,9,16);x.fillRect(32,14,9,18);x.fillStyle=accent;x.fillRect(17,12,14,9);x.fillRect(18,25,12,8);x.fillRect(12,35,8,8);x.fillRect(29,35,8,8);x.fillStyle='#17161b';x.fillRect(19,15,3,3);x.fillRect(27,15,3,3);return c.toDataURL('image/png');}"
                + "window.POKEIDLE_MOVE_ICON_MAP={earthquake:nativeSprite('#6b6543','#e3c054'),'rock-slide':nativeSprite('#878573','#c3d5c7'),'drill-run':nativeSprite('#8a684a','#e6928a'),'ice-fang':nativeSprite('#2485a6','#54bad2')};"
                + "window.__visualSpecies={gyarados:{id:'gyarados',name:'Gyarados',normal_sprite_url:nativeSprite('#2485a6','#54bad2'),shiny_sprite_url:nativeSprite('#e6928a','#e3c054')},charizard:{id:'charizard',name:'Charizard',normal_sprite_url:nativeSprite('#b66b3d','#e3c054'),shiny_sprite_url:nativeSprite('#4a4b55','#e6928a')},dragonite:{id:'dragonite',name:'Dragonite',normal_sprite_url:nativeSprite('#c69a68','#c3d5c7'),shiny_sprite_url:nativeSprite('#55a058','#e3c054')}};"
                + "window.PokeIdle=window.PokeIdle||{};window.PokeIdle.Localization={get:function(){return 'en-US';}};window.PokeIdle.PersistentHud=window.PokeIdle.PersistentHud||{};"
                + "window.PokeIdle.PersistentHud._teamHud={el:hud,_creatures:[{id:'visual-player',species_id:"
                + QuoteJs(playerSpeciesId) + ",name:" + QuoteJs(playerName) + ",level:" + playerLevel + ",hp:" + playerHp + ",max_hp:" + playerMaxHp
                + ",exp:" + (isRhyxus ? 195000 : 183000) + ",exp_current_level:" + (isRhyxus ? 190000 : 180000) + ",exp_next_level:" + (isRhyxus ? 200000 : 186000)
                + ",elements:" + (isRhyxus ? "['rock','ground']" : "['water','flying']")
                + ",is_leader:true},{id:'visual-bench',species_id:'visual-bench',name:'Umbreon',level:160,hp:3200,max_hp:3600,elements:['dark'],is_leader:false}]};"
                + "window.__visualLeader='visual-player';window.__visualSettings={auto_capture:{enabled:true,common_enabled:true,shiny_enabled:true,common_capsule_item_id:'capsule_ultra',shiny_capsule_item_id:'capsule_master',species_filter:[],min_quality:'common',mode:'split'},auto_potion:{enabled:true,hp_threshold:40,potion_item_id:'potion_hyper',auto_revive:false,revive_item_id:''},auto_sell:{enabled:false,qualities:[]},auto_extract:{enabled:false,qualities:[]}};"
                + "window.PokeIdle.Bus={on:function(){},off:function(){},emit:function(){}};"
                + "window.PokeIdle.Api={getSpecies:function(id){return Promise.resolve({data:window.__visualSpecies[String(id)]||{id:String(id),name:String(id)}});},getMoveset:function(id){return Promise.resolve({creature_id:String(id),mode:'manual',selected:[{id:'earthquake',name:'Earthquake',element:'ground'},{id:'rock-slide',name:'Rock Slide',element:'rock'},{id:'drill-run',name:'Drill Run',element:'ground'},{id:'ice-fang',name:'Ice Fang',element:'ice'}]});},getTeam:function(){return Promise.resolve({team:{leader_id:window.__visualLeader}});},setTeamLeader:function(id){window.__visualLeader=String(id);window.PokeIdle.PersistentHud._teamHud._creatures.forEach(function(c){c.is_leader=String(c.id)===window.__visualLeader;});return Promise.resolve({xp_share:null});},getHuntSettings:function(){return Promise.resolve(JSON.parse(JSON.stringify(window.__visualSettings)));},getInventory:function(){return Promise.resolve({inventory:[{item_id:'capsule_master',name:'Master Ball',type:'capsule',qty:2,catch_multiplier:10},{item_id:'capsule_ultra',name:'Ultra Ball',type:'capsule',qty:12,catch_multiplier:2},{item_id:'capsule_great',name:'Great Ball',type:'capsule',qty:30,catch_multiplier:1.5},{item_id:'potion_hyper',name:'Hyper Potion',type:'potion',qty:8},{item_id:'potion_max',name:'Max Potion',type:'potion',qty:3},{item:{id:'weak_thread',name:'Weak Thread',rarity:'weak'},qty:9},{item:{id:'common_leaf',name:'Common Leaf',quality:'common'},qty:9},{item:{id:'uncommon_seed',name:'Uncommon Seed',rarity:'uncommon'},qty:9},{item:{id:'rare_straw',name:'Rare Straw',rarity:'rare'},qty:9},{item:{id:'epic_dust',name:'Epic Dust',rarity:'epic'},qty:9},{item:{id:'legendary_gem',name:'Legendary Gem',rarity:'legendary'},qty:9},{item:{id:'mythical_orb',name:'Mythical Orb',rarity:'mythical'},qty:9}]});},updateHuntSettings:function(capture,potion,unused,sell,extract){window.__visualSettings={auto_capture:capture,auto_potion:potion,auto_sell:sell,auto_extract:extract};return Promise.resolve({});}};"
                + "var rarities=['epic','legendary','mythical','rare'];"
                + "var now=Date.now();var attempts=[];for(var i=0;i<40;i++){attempts.push({atMs:now-(i+1)*47000,speciesId:i%2===0?'dragonite':'gengar',species:i%2===0?'Dragonite':'Gengar',rarity:rarities[i%rarities.length],shiny:i%4===3,qualityMultiplier:1.25+(i%7)*0.08,chance:i===0?0.00875:0.015+(i*0.001),result:i===3?'captured':'fled',ball:i%2===0?'Ultra Ball':'Great Ball',ivTotal:i===0?176:i===3?151:null,captureDetails:i===3?{gender:'female',nature:'adamant',ivTotal:151,ivs:{hp:31,atk:31,def:25,spa:20,spd:22,spe:22}}:null});}"
                + "var lootIds=['weak_thread','common_leaf','uncommon_seed','rare_straw','epic_dust','legendary_gem','mythical_orb'];var lootHistory=[];for(var j=0;j<16;j++){var direct=37+j;var lootValue=j*11;var sold=j===2;var autoValue=sold?2500:0;lootHistory.push({atMs:now-(j+1)*53000,species:j%2===0?'Dragonite':'Gengar',directGold:direct,lootSellValue:lootValue,autoSold:sold,autoSellValue:autoValue,totalValue:direct+lootValue+autoValue,items:[{itemId:lootIds[j%lootIds.length],qty:(j%5)+1}]});}"
                + "var rarityCounts={unknown:{captured:0,seen:1,shinyCaptured:0,shinySeen:0},weak:{captured:1,seen:3,shinyCaptured:0,shinySeen:0},common:{captured:4,seen:10,shinyCaptured:0,shinySeen:0},uncommon:{captured:3,seen:8,shinyCaptured:0,shinySeen:0},rare:{captured:3,seen:7,shinyCaptured:1,shinySeen:2},epic:{captured:3,seen:6,shinyCaptured:1,shinySeen:1},legendary:{captured:2,seen:5,shinyCaptured:0,shinySeen:0},mythical:{captured:1,seen:3,shinyCaptured:0,shinySeen:0}};"
                + "var summary={protocol:1,available:true,appVersion:'1.13.4',leadershipActive:true,status:"
                + QuoteJs("running")
                + ",activeMs:" + (isRhyxus ? 754000 : 260000)
                + ",seen:" + (isRhyxus ? 42 : 31)
                + ",seenPerHour:" + (isRhyxus ? "200.5" : "180")
                + ",captured:" + (isRhyxus ? 17 : 9)
                + ",failed:" + (isRhyxus ? 25 : 22)
                + ",captureRate:" + (isRhyxus ? "0.4047619" : "0.2903226")
                + ",trainerExp:" + (isRhyxus ? 258400 : 120500)
                + ",trainerExpPerHour:" + (isRhyxus ? 123400 : 85000)
                + ",pokemonExp:" + (isRhyxus ? 512900 : 230100)
                + ",pokemonExpPerHour:" + (isRhyxus ? 345600 : 210000)
                + ",directGold:" + (isRhyxus ? 12000000 : 6200000)
                + ",lootSellValue:" + (isRhyxus ? 2250000 : 1420000)
                + ",autoSellValue:" + (isRhyxus ? 750000 : 400000)
                + ",revenue:" + (isRhyxus ? 15000000 : 8020000)
                + ",revenuePerHour:" + (isRhyxus ? 12960000 : 7550000)
                + ",dollar:" + (isRhyxus ? 15000000 : 8020000)
                + ",dollarPerHour:" + (isRhyxus ? 12960000 : 7550000)
                + ",expenses:" + (isRhyxus ? 3000000 : 1270000)
                + ",expensesPerHour:" + (isRhyxus ? 2592000 : 1180000)
                + ",profit:" + (isRhyxus ? 12000000 : 6750000)
                + ",profitPerHour:" + (isRhyxus ? 10368000 : 6370000)
                + ",rarePlusFailed:" + (isRhyxus ? 2 : 3)
                + ",epicPlusFailed:" + (isRhyxus ? 1 : 2)
                + ",shinySeen:" + (isRhyxus ? 1 : 0)
                + ",shinyCaptured:" + (isRhyxus ? 1 : 0)
                + ",seenUnknown:1,seenWeak:3,seenCommon:10,seenUncommon:8,seenRare:7,seenEpic:6,seenLegendary:5,seenMythical:3,rarityCounts:rarityCounts,"
                + "latestCaptureChance:" + (isRhyxus ? "0.033936651583710405" : "0.004")
                + ",currentTarget:{speciesId:" + QuoteJs(targetSpeciesId) + ",zoneId:" + QuoteJs(isRhyxus ? "visual-zone-left" : "visual-zone-right") + ",species:" + QuoteJs(targetName) + ",level:" + targetLevel + ",rarity:'epic',shiny:"
                + (isRhyxus ? "true" : "false") + ",elements:" + (isRhyxus ? "['fire','flying']" : "['dragon','flying']") + ",pokemonExp:" + (isRhyxus ? 4305 : 3920) + "},attemptHistory:attempts.slice(0,32),specialHistory:attempts,lootHistory:lootHistory};"
                + "var visualBaseTarget=Object.assign({},summary.currentTarget);"
                + "window.__cwVisualSetCurrent=function(kind){summary.available=true;summary.appVersion='1.15.1';summary.activityKind='hunt';summary.status='running';summary.sessionGeneration=(summary.sessionGeneration||0)+1;summary.startedAtMs=now-300000;summary.endedAtMs=null;summary.currentTarget=null;summary.currentSessionSpecies=null;"
                + "if(kind==='live-hunt'){summary.currentTarget=Object.assign({},visualBaseTarget);}"
                + "else if(kind==='cold-hunt'||kind==='between-hunt'){summary.currentSessionSpecies={speciesId:'dragonite',species:'Dragonite'};}"
                + "else if(kind==='paused-hunt'||kind==='ended-hunt'){summary.currentSessionSpecies={speciesId:'dragonite',species:'Dragonite'};summary.status=kind==='paused-hunt'?'paused':'waiting';if(kind==='ended-hunt')summary.endedAtMs=now-10000;}"
                + "else if(kind==='expedition-running'){summary.activityKind='expedition';}"
                + "else if(kind==='expedition-paused'||kind==='expedition-ended'){summary.activityKind='expedition';summary.status=kind==='expedition-paused'?'paused':'waiting';summary.currentSessionSpecies={speciesId:'gyarados',species:'Gyarados'};if(kind==='expedition-ended')summary.endedAtMs=now-10000;}"
                + "else if(kind==='new-hunt'){}else if(kind==='unavailable'){summary.available=false;}else return false;return true;};"
                + "Object.defineProperty(window,'__POKEPIXEL_HUNT_ANALYZER_PUBLIC__',{configurable:true,enumerable:false,value:Object.freeze({protocol:1,getSummary:function(){return Object.assign({},summary,{capturedAtMs:Date.now()-1000,currentTarget:summary.currentTarget?Object.assign({},summary.currentTarget):null,currentSessionSpecies:summary.currentSessionSpecies?Object.assign({},summary.currentSessionSpecies):null,rarityCounts:Object.fromEntries(Object.entries(summary.rarityCounts).map(function(entry){return [entry[0],Object.assign({},entry[1])];})),attemptHistory:summary.attemptHistory.map(function(item){return Object.assign({},item);}),specialHistory:summary.specialHistory.map(function(item){return Object.assign({},item);}),lootHistory:summary.lootHistory.map(function(item){return Object.assign({},item,{items:(item.items||[]).map(function(entry){return Object.assign({},entry);})});})});}})});"
                + "Object.defineProperty(window,'__POKEPIXEL_HUNT_ANALYZER_CONTROL__',{configurable:true,enumerable:false,value:Object.freeze({protocol:1,act:function(action){return Promise.resolve({ok:action==='pause'||action==='resume'||action==='reset'});}})});"
                + "})();\n";
            await pane.View.CoreWebView2.ExecuteScriptAsync(setup + _betterUiScript);
        }

        private async Task WaitForVisualCardDashboardAsync(AccountPane pane)
        {
            for (var attempt = 0; attempt < 40; attempt++)
            {
                var visible = await pane.View.CoreWebView2.ExecuteScriptAsync(
                    "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');var player=document.querySelector('[data-card-sprite=\"player\"]');var target=document.querySelector('[data-card-sprite=\"target\"]');var loot=document.querySelector('.ppbui-cards-loot-item[data-rarity=\"rare\"],.ppbui-cards-loot-item[data-rarity=\"common\"]');var moves=document.querySelectorAll('[data-card-player-moves] .ppbui-cards-move');var attempts=document.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt');return Boolean(root&&!root.hidden&&player&&!player.hidden&&target&&!target.hidden&&loot&&moves.length===4&&attempts.length===40);})()"
                );
                if (string.Equals(visible, "true", StringComparison.Ordinal)) return;
                await Task.Delay(50);
                Application.DoEvents();
            }
            throw new InvalidOperationException("Real Better UI card dashboard did not become visible in visual smoke.");
        }

        private async Task AssertVisualCardDashboardAsync(AccountPane pane, string context)
        {
            if (pane == null || pane.View == null || pane.View.CoreWebView2 == null)
                throw new InvalidOperationException("Missing visual card pane at " + context + ".");
            var visible = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');return Boolean(root&&!root.hidden);})()"
            );
            var battleHeightRaw = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var node=document.querySelector('.ppbui-cards-battle');return node?Math.round(node.getBoundingClientRect().height):-1;})()"
            );
            var viewportWidthRaw = await pane.View.CoreWebView2.ExecuteScriptAsync("window.innerWidth");
            var overflow = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');return Boolean(root&&root.scrollWidth>root.clientWidth+1);})()"
            );
            var dataContract = await pane.View.CoreWebView2.ExecuteScriptAsync(
                    "(function(){"
                    + "var player=document.querySelector('[data-card-sprite=player]');var playerCard=document.querySelector('[data-card-combat=player]');var targetImg=document.querySelector('[data-card-sprite=target]');"
                    + "var rarityFilters=document.querySelectorAll('[data-card-attempt-rarity]');var rarityTiles=document.querySelectorAll('[data-rarity-key]');var shinyRarity=document.querySelector('[data-rarity-shiny]:not([hidden])');var shinyFilter=document.querySelector('[data-card-attempt-shiny]');var resultFilter=document.querySelector('[data-card-attempt-result]');"
                    + "var huntTab=document.querySelector('[data-card-story-tab=hunt]');var lootTab=document.querySelector('[data-card-story-tab=loot]');var huntPanel=document.querySelector('[data-card-story-panel=hunt]');var lootPanel=document.querySelector('[data-card-story-panel=loot]');var lootRarity=document.querySelector('[data-card-loot-rarity]');"
                    + "var loot=document.querySelector('[data-card-field=loot-value]');var profit=document.querySelector('[data-card-field=profit]');var revenue=document.querySelector('[data-card-field=revenue]');var epicFailed=document.querySelector('[data-card-field=epic-failed]');var xpHour=document.querySelector('[data-card-field=pokemon-xp-hour]');"
                    + "var targetMeta=document.querySelector('[data-card-field=target-meta]');var playerTypes=document.querySelector('[data-card-elements=player]');var targetTypes=document.querySelector('[data-card-elements=target]');var playerMoves=document.querySelector('[data-card-player-moves]');var captured=document.querySelector('[data-card-attempt-body] .ppbui-cards-attempt[data-result=captured]');var capturedDetails=captured&&captured.querySelector('.ppbui-cards-attempt-details');var captureToggle=document.querySelector('[data-card-genetics-toggle]');"
                    + "var lootRows=document.querySelectorAll('[data-card-loot-body] .ppbui-cards-loot-row');var firstLoot=lootRows.length?lootRows[0]:null;var firstLootItem=firstLoot&&firstLoot.querySelector('.ppbui-cards-loot-item:not(.ppbui-cards-loot-item--empty)');var firstLootTotal=firstLoot&&firstLoot.querySelector('[data-card-loot-total]');var lootSummary=document.querySelector('[data-card-loot-summary]');var lootSummaryTiles=lootSummary?Array.from(lootSummary.querySelectorAll('.ppbui-cards-loot-drop')):[];var history=document.querySelector('.ppbui-cards-attempt-table');var attemptScroll=document.querySelector('[data-card-attempt-scroll]');var attemptLabels=document.querySelector('.ppbui-cards-attempt-labels');var economy=document.querySelector('.ppbui-cards-economy');"
                    + "var summaryCard=document.querySelector('.ppbui-cards-card--summary');var captureCard=document.querySelector('.ppbui-cards-card--capture');var rarityCard=document.querySelector('.ppbui-cards-card--rarity');var teamRoster=document.querySelector('[data-card-team-list]');var teamButtons=teamRoster?teamRoster.querySelectorAll('[data-card-team-member]'):[];var activeTeam=teamRoster?teamRoster.querySelector('[data-card-team-member][aria-pressed=true]'):null;"
                    + "var pause=document.querySelector('[data-card-session-pause]');var reset=document.querySelector('[data-card-session-reset]');var target=document.querySelector('[data-card-combat=target]');var shiny=document.querySelector('[data-card-shiny-badge]');var rarityBadge=document.querySelector('[data-card-target-rarity]');var hpRow=document.querySelector('[data-card-player-hp-row]');var expRow=document.querySelector('[data-card-player-exp-row]');var expMeter=document.querySelector('[data-card-player-exp-meter]');var style=history?getComputedStyle(history):null;"
                    + "var playerSrc=player?player.getAttribute('src')||'':'';var targetSrc=targetImg?targetImg.getAttribute('src')||'':'';var nativeAsset=function(src){return src.indexOf('data:image/png;base64,')===0&&src.length>300&&src.indexOf('pokemondb')<0;};var targetVisualReady=targetImg&&!targetImg.hidden&&nativeAsset(targetSrc);var targetShiny=target&&target.dataset.shiny==='true';"
                    + "var teamLevels=teamButtons.length===2&&Array.from(teamButtons).every(function(button){var name=button.querySelector('strong');var level=button.querySelector('span');return name&&name.textContent&&level&&level.textContent.indexOf('Lv.')===0;});var sixTeamRows=teamRoster&&teamRoster.children.length===6;var teamBeforePlayer=teamRoster&&playerCard&&Boolean(teamRoster.compareDocumentPosition(playerCard)&Node.DOCUMENT_POSITION_FOLLOWING);"
                    + "var legacyControlsRemoved=!document.querySelector('[data-card-matchup]')&&!document.querySelector('[data-card-ball-scope]')&&!document.querySelector('[data-card-ball-select]')&&!document.querySelector('[data-card-potion-select]')&&!document.querySelector('[data-card-ball-label]');var row=history&&history.querySelector('[data-card-attempt-body] .ppbui-cards-attempt');var timelineReady=history&&history.getAttribute('role')==='list'&&!history.querySelector('.ppbui-cards-attempt-head');var rowHeight=row?row.getBoundingClientRect().height:0;var denseRow=rowHeight>0&&rowHeight<=48;var labelsReady=attemptLabels&&attemptLabels.children.length===8&&attemptLabels.textContent.indexOf('Quality')>=0&&attemptLabels.textContent.indexOf('Chance')>=0&&attemptLabels.textContent.indexOf('IV Total')>=0;var fields=row?Array.from(row.children).filter(function(node){return node.hasAttribute&&node.hasAttribute('data-attempt-column');}):[];var centers=fields.map(function(node){var r=node.getBoundingClientRect();return (r.top+r.bottom)/2;});var singleLineReady=centers.length===8&&Math.max.apply(Math,centers)-Math.min.apply(Math,centers)<=2;var chanceCell=row&&row.querySelector('[data-attempt-column=\"6\"]');var historyRect=history?history.getBoundingClientRect():null;var chanceRect=chanceCell?chanceCell.getBoundingClientRect():null;var chanceVisible=Boolean(chanceRect&&historyRect&&chanceRect.width>0&&chanceRect.left>=historyRect.left-1&&chanceRect.right<=historyRect.right+1);var storyScrollReady=attemptScroll&&getComputedStyle(attemptScroll).overflowX==='auto'&&attemptScroll.scrollWidth>=attemptScroll.clientWidth;"
                    + "var resultButtons=Array.from(document.querySelectorAll('button[data-card-attempt-result]'));var resultReady=resultButtons.length===3&&resultButtons.map(function(b){return b.dataset.cardAttemptResult;}).join(',')===',captured,fled'&&resultButtons.filter(function(b){return b.getAttribute('aria-pressed')==='true';}).length===1&&resultButtons.filter(function(b){return b.tabIndex===0;}).length===1;var storyReady=false;if(huntTab&&lootTab&&huntPanel&&lootPanel&&huntTab.getAttribute('aria-selected')==='true'&&!huntPanel.hidden&&lootPanel.hidden){lootTab.click();storyReady=lootTab.getAttribute('aria-selected')==='true'&&huntPanel.hidden&&!lootPanel.hidden;huntTab.click();storyReady=storyReady&&huntTab.getAttribute('aria-selected')==='true'&&!huntPanel.hidden&&lootPanel.hidden;}"
                    + "var lootTotalReady=firstLootTotal&&firstLootTotal.textContent.indexOf('Total ')===0&&firstLootTotal.getAttribute('aria-label')&&firstLootTotal.getAttribute('aria-label').indexOf('Total: ')===0;var lootStoryReady=lootRows.length===16&&firstLoot&&firstLootItem&&lootTotalReady&&firstLoot.querySelector('.ppbui-cards-loot-finance');var lootSummaryReady=lootSummary&&lootSummary.getAttribute('role')==='list'&&lootSummaryTiles.length===7&&lootSummaryTiles.map(function(tile){return tile.dataset.rarity;}).join(',')==='weak,common,uncommon,rare,epic,legendary,mythical'&&lootSummaryTiles.every(function(tile){return tile.getAttribute('role')==='listitem'&&tile.getAttribute('aria-label')&&tile.querySelector('.ppbui-cards-loot-drop-qty');})&&lootSummary.previousElementSibling&&lootSummary.previousElementSibling.classList.contains('ppbui-cards-loot-filters')&&lootSummary.nextElementSibling&&lootSummary.nextElementSibling.classList.contains('ppbui-cards-loot-table');var lootFilterReady=lootRarity&&lootRarity.options.length===9&&Array.from(lootRarity.options).map(function(o){return o.value;}).join(',')===',weak,common,uncommon,rare,epic,legendary,mythical,none';var lootFilterFunctional=false;if(lootFilterReady){lootTab.click();lootRarity.value='rare';lootRarity.dispatchEvent(new Event('change'));var filteredLoot=Array.from(document.querySelectorAll('[data-card-loot-body] .ppbui-cards-loot-item:not(.ppbui-cards-loot-item--empty)'));var filteredSummary=Array.from(document.querySelectorAll('[data-card-loot-summary] .ppbui-cards-loot-drop'));lootFilterFunctional=filteredLoot.length>0&&filteredLoot.every(function(item){return item.dataset.rarity==='rare';})&&!document.querySelector('[data-card-loot-body] .ppbui-cards-loot-item:not([data-rarity=rare])')&&filteredSummary.length===1&&filteredSummary[0].dataset.rarity==='rare';lootRarity.value='';lootRarity.dispatchEvent(new Event('change'));huntTab.click();}var narrowStory=innerWidth<=640;var rowRect=row?row.getBoundingClientRect():null;var allFieldsVisible=fields.length===8&&rowRect&&historyRect&&fields.every(function(cell){var r=cell.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=historyRect.left-1&&r.right<=historyRect.left+history.clientLeft+history.clientWidth+1&&r.top>=rowRect.top-1&&r.bottom<=rowRect.bottom+1;});var bandsReady=fields.length===8&&fields[2].getBoundingClientRect().top+4<fields[0].getBoundingClientRect().top&&fields[3].getBoundingClientRect().top>fields[0].getBoundingClientRect().top+4;var compactLabels=fields.length===8&&fields.every(function(cell){var content=getComputedStyle(cell,'::before').content;return content&&content!=='none'&&content!=='normal';});var responsiveTimelineReady=narrowStory?(rowHeight>=65&&rowHeight<=220&&bandsReady&&allFieldsVisible&&compactLabels&&!attemptLabels.offsetParent&&getComputedStyle(attemptScroll).overflowX==='hidden'):(denseRow&&labelsReady&&singleLineReady&&storyScrollReady);var historyBounded=history&&history.clientHeight<=(narrowStory?252:190)+2&&history.scrollHeight>history.clientHeight;"
                    + "var cvReady=rarityTiles.length===7&&!document.querySelector('[data-rarity-key=unknown]')&&Array.from(rarityTiles).every(function(tile){var value=tile.querySelector('strong');return value&&value.textContent.indexOf('/')>0;});var compactReady=revenue&&/[kMB]/.test(revenue.textContent)&&revenue.title.indexOf('Exact value:')===0;var rarityFilterReady=rarityFilters.length===3&&Array.from(rarityFilters).map(function(i){return i.value;}).join(',')==='epic,legendary,mythical'&&Array.from(rarityFilters).every(function(i){return i.checked;});"
                    + "var typeReady=playerTypes&&!playerTypes.hidden&&targetTypes&&!targetTypes.hidden;var targetMetaReady=targetMeta&&targetMeta.textContent.indexOf('Lv.')===0&&targetMeta.textContent.indexOf('XP')<0;var moveNodes=playerMoves?playerMoves.querySelectorAll('.ppbui-cards-move'):[];var movesReady=playerMoves&&!playerMoves.hidden&&moveNodes.length===4&&Array.from(moveNodes).every(function(node){var image=node.querySelector('img');return node.title&&image&&nativeAsset(image.getAttribute('src')||'');});var captureDetailsReady=capturedDetails&&capturedDetails.textContent.indexOf('Gender')>=0&&capturedDetails.textContent.indexOf('Nature')>=0&&capturedDetails.textContent.indexOf('IV 151')>=0;var qualityReady=captured&&captured.querySelector('[data-attempt-column=\"3\"]')&&captured.querySelector('[data-attempt-column=\"3\"]').textContent.indexOf('×')===0;var geneticsReady=!captureToggle&&capturedDetails&&!capturedDetails.hidden&&captureDetailsReady;"
                    + "var overviewOrderReady=summaryCard&&captureCard&&rarityCard&&Boolean(summaryCard.compareDocumentPosition(captureCard)&Node.DOCUMENT_POSITION_FOLLOWING)&&Boolean(captureCard.compareDocumentPosition(rarityCard)&Node.DOCUMENT_POSITION_FOLLOWING);var targetRect=target?target.getBoundingClientRect():null;var rarityRect=rarityCard?rarityCard.getBoundingClientRect():null;var targetCropAligned=innerWidth<900||Boolean(targetRect&&rarityRect&&Math.abs(targetRect.left-rarityRect.left)<=2&&Math.abs(targetRect.right-rarityRect.right)<=2);var xpPrimary=xpHour&&xpHour.parentElement&&xpHour.parentElement.classList.contains('ppbui-cards-kpi-primary');var expReady=expRow&&!expRow.hidden&&expMeter&&Number(expMeter.getAttribute('aria-valuenow'))>0&&Number(expMeter.getAttribute('aria-valuemax'))>Number(expMeter.getAttribute('aria-valuenow'));var lastChanceToolbarRemoved=!document.querySelector('[data-card-field=battle-last-chance]')&&!document.querySelector('.ppbui-cards-battle-readout');"
                    + "var ok=Boolean(player&&!player.hidden&&nativeAsset(playerSrc)&&targetVisualReady&&rarityFilterReady&&shinyFilter&&shinyFilter.options.length===3&&resultReady&&storyReady&&timelineReady&&responsiveTimelineReady&&lootStoryReady&&lootSummaryReady&&lootFilterReady&&lootFilterFunctional&&geneticsReady&&qualityReady&&overviewOrderReady&&targetCropAligned&&loot&&loot.textContent.indexOf('$')>=0&&profit&&profit.textContent.indexOf('$')>=0&&compactReady&&targetMetaReady&&movesReady&&typeReady&&epicFailed&&epicFailed.textContent!=='—'&&xpPrimary&&cvReady&&shinyRarity&&shinyRarity.textContent.indexOf('✦')===0&&economy&&history&&Boolean(economy.compareDocumentPosition(history)&Node.DOCUMENT_POSITION_FOLLOWING)&&historyBounded&&style&&style.overflowY==='auto'&&teamRoster&&sixTeamRows&&teamButtons.length===2&&teamLevels&&activeTeam&&activeTeam.dataset.cardTeamMember==='visual-player'&&teamBeforePlayer&&legacyControlsRemoved&&pause&&!pause.disabled&&reset&&!reset.disabled&&target&&shiny&&shiny.hidden===!targetShiny&&rarityBadge&&!rarityBadge.hidden&&hpRow&&!hpRow.hidden&&expReady&&lastChanceToolbarRemoved);"
                    + "window.__PPBUI_SMOKE_DIAG__={innerWidth:innerWidth,rowHeight:rowHeight,resultReady:!!resultReady,storyReady:!!storyReady,timelineReady:!!timelineReady,denseRow:!!denseRow,labelsReady:!!labelsReady,singleLineReady:!!singleLineReady,bandsReady:!!bandsReady,allFieldsVisible:!!allFieldsVisible,compactLabels:!!compactLabels,responsiveTimelineReady:!!responsiveTimelineReady,storyScrollReady:!!storyScrollReady,chanceVisible:!!chanceVisible,lootStoryReady:!!lootStoryReady,lootSummaryReady:!!lootSummaryReady,lootTotalReady:!!lootTotalReady,lootFilterReady:!!lootFilterReady,lootFilterFunctional:!!lootFilterFunctional,geneticsReady:!!geneticsReady,qualityReady:!!qualityReady,overviewOrderReady:!!overviewOrderReady,targetCropAligned:!!targetCropAligned,targetVisualReady:!!targetVisualReady,historyBounded:!!historyBounded,rarityFilterReady:!!rarityFilterReady,captureDetailsReady:!!captureDetailsReady,compactReady:!!compactReady,typeReady:!!typeReady,targetMetaReady:!!targetMetaReady,movesReady:!!movesReady,expReady:!!expReady};return ok;})()"
                );
            var attemptRowsRaw = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "document.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt').length"
            );
            // The Cards poll may reconcile between separate WebView2 script evaluations.
            // Retry only the transient row-count sample after the full contract was validated.
            for (var retry = 0;
                 retry < 6 && string.Equals(dataContract, "true", StringComparison.Ordinal) && attemptRowsRaw != "40";
                 retry++)
            {
                await Task.Delay(50);
                attemptRowsRaw = await pane.View.CoreWebView2.ExecuteScriptAsync(
                    "document.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt').length"
                );
            }
            var dataDiagnostics = string.Equals(dataContract, "true", StringComparison.Ordinal)
                ? string.Empty
                : await pane.View.CoreWebView2.ExecuteScriptAsync(
                    "JSON.stringify(window.__PPBUI_SMOKE_DIAG__||{})"
                );
            int battleHeight;
            int attemptRows;
            int viewportWidth;
            if (!int.TryParse(viewportWidthRaw, out viewportWidth)) viewportWidth = 900;
            var maximumBattleHeight = viewportWidth <= 319 ? 360
                : viewportWidth <= 519 ? 270 : 164;
            if (!string.Equals(visible, "true", StringComparison.Ordinal)
                || !int.TryParse(battleHeightRaw, out battleHeight)
                || battleHeight <= 0
                || battleHeight > maximumBattleHeight
                || !string.Equals(overflow, "false", StringComparison.Ordinal)
                || !int.TryParse(attemptRowsRaw, out attemptRows)
                || attemptRows != 40
                || !string.Equals(dataContract, "true", StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    "Card dashboard geometry/data regression at " + context
                    + ": visible=" + visible
                    + " battle=" + battleHeightRaw
                    + " overflow=" + overflow
                    + " attempts=" + attemptRowsRaw
                    + " dataContract=" + dataContract
                    + " diag=" + dataDiagnostics + "."
                );
            }
        }

        private async Task ScrollVisualCardsToHistoryAsync(AccountPane pane)
        {
            if (pane == null || pane.View == null || pane.View.CoreWebView2 == null)
                throw new InvalidOperationException("Missing visual card pane for History evidence.");
            var result = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');var history=document.querySelector('.ppbui-cards-history');var table=document.querySelector('.ppbui-cards-attempt-table');var shiny=document.querySelector('[data-card-attempt-body] .ppbui-cards-attempt[data-shiny=\"true\"]');var normal=document.querySelector('[data-card-attempt-body] .ppbui-cards-attempt[data-shiny=\"false\"]');if(!root||!history||!table||!shiny||!normal)return false;var rootRect=root.getBoundingClientRect();var historyRect=history.getBoundingClientRect();root.scrollTop=Math.max(0,root.scrollTop+historyRect.top-rootRect.top-8);table.scrollTop=Math.min(72,Math.max(1,table.scrollHeight-table.clientHeight));return Boolean(root.scrollTop>0&&table.scrollTop>0&&table.scrollHeight>table.clientHeight);})()"
            );
            if (!string.Equals(result, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("History visual evidence could not be positioned with an internal scroll.");
        }

        private async Task CaptureNarrowHuntStoryEvidenceAsync(AccountPane pane, string outputDir)
        {
            if (pane == null || pane.View == null || pane.View.CoreWebView2 == null)
                throw new InvalidOperationException("Missing local visual pane for compact Hunt Story evidence.");
            var configured = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                + "if(!root)return false;root.style.width='235px';root.style.right='auto';return true;})()"
            );
            if (!string.Equals(configured, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("Could not constrain synthetic Hunt Story to 235px.");
            await ScrollVisualCardsToHistoryAsync(pane);
            await pane.View.CoreWebView2.ExecuteScriptAsync(
                "document.querySelector('.ppbui-cards-attempt-table').scrollTop=0"
            );
            await Task.Delay(40);
            var verified = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var table=document.querySelector('.ppbui-cards-attempt-table');"
                + "var rows=table&&Array.from(table.querySelectorAll('.ppbui-cards-attempt'));"
                + "if(!rows||!rows.length||table.clientWidth>=235)return false;"
                + "var samples=[rows[0],rows.find(function(r){return r.dataset.shiny==='true';}),"
                + "rows.find(function(r){return r.dataset.result==='captured';})];"
                + "if(samples.some(function(r){return !r;}))return false;"
                + "var bounds=table.getBoundingClientRect(),right=bounds.left+table.clientLeft+table.clientWidth;"
                + "return samples.every(function(sample){var cells=Array.from(sample.querySelectorAll('[data-attempt-column]'));"
                + "if(cells.length!==8||getComputedStyle(sample).gridTemplateColumns.split(' ').length!==2)return false;"
                + "return cells.every(function(cell){var box=cell.getBoundingClientRect();"
                + "var before=getComputedStyle(cell,'::before');return box.width>0&&box.height>0"
                + "&&box.left>=bounds.left-1&&box.right<=right+1"
                + "&&before.content!=='none'&&before.content!=='normal'&&parseFloat(before.fontSize)>=9;});});})()"
            );
            if (!string.Equals(verified, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("Hunt Story 235px dropped, clipped or unlabeled a required field.");
            var fullPath = Path.Combine(outputDir, "workspace-cards-history-235-composite.png");
            await CaptureWorkspaceCompositeAsync(fullPath, false);
            using (var full = new Bitmap(fullPath))
            using (var crop = full.Clone(new Rectangle(
                0, DpiMetric(114), DpiMetric(252), DpiMetric(394)
            ), full.PixelFormat))
            {
                crop.Save(Path.Combine(outputDir, "workspace-cards-history-235.png"),
                    System.Drawing.Imaging.ImageFormat.Png);
            }
            await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var table=document.querySelector('.ppbui-cards-attempt-table');"
                + "var shiny=table&&table.querySelector('.ppbui-cards-attempt[data-shiny=\"true\"]');"
                + "if(!shiny)return false;table.scrollTop+=shiny.getBoundingClientRect().top"
                + "-table.getBoundingClientRect().top;return true;})()"
            );
            await Task.Delay(30);
            var shinyPath = Path.Combine(outputDir, "workspace-cards-history-235-shiny-composite.png");
            await CaptureWorkspaceCompositeAsync(shinyPath, false);
            using (var full = new Bitmap(shinyPath))
            using (var crop = full.Clone(new Rectangle(
                0, DpiMetric(114), DpiMetric(252), DpiMetric(394)
            ), full.PixelFormat))
            {
                crop.Save(Path.Combine(outputDir, "workspace-cards-history-235-shiny.png"),
                    System.Drawing.Imaging.ImageFormat.Png);
            }
            await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                + "if(root){root.style.removeProperty('width');root.style.removeProperty('right');}return true;})()"
            );
        }

        private async Task SetVisualStoryTabAsync(AccountPane pane, string tab)
        {
            if (pane == null || pane.View == null || pane.View.CoreWebView2 == null)
                throw new InvalidOperationException("Missing visual card pane for Story evidence.");
            var requested = string.Equals(tab, "loot", StringComparison.OrdinalIgnoreCase)
                ? "loot"
                : "hunt";
            var result = await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var button=document.querySelector('[data-card-story-tab=\"" + requested + "\"]');"
                + "var panel=document.querySelector('[data-card-story-panel=\"" + requested + "\"]');"
                + "if(!button||!panel)return false;button.click();return button.getAttribute('aria-selected')==='true'&&!panel.hidden;})()"
            );
            if (!string.Equals(result, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("Story tab could not switch to " + requested + " for visual evidence.");
        }

        private async Task CaptureLootSummarySmokeEvidenceAsync(string outputDir)
        {
            var left = GetPaneForSide(PaneSide.Left);
            var right = GetPaneForSide(PaneSide.Right);
            await Task.WhenAll(
                ScrollVisualCardsToHistoryAsync(left),
                ScrollVisualCardsToHistoryAsync(right)
            );
            await Task.WhenAll(
                SetVisualStoryTabAsync(left, "loot"),
                SetVisualStoryTabAsync(right, "loot")
            );
            await Task.Delay(40);
            Application.DoEvents();

            foreach (var pane in new[] { left, right })
            {
                var verified = await pane.View.CoreWebView2.ExecuteScriptAsync(
                    "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                    + "var summary=document.querySelector('[data-card-loot-summary]');"
                    + "var filters=document.querySelector('.ppbui-cards-loot-filters');"
                    + "var table=document.querySelector('.ppbui-cards-loot-table');"
                    + "var tiles=summary?Array.from(summary.querySelectorAll('.ppbui-cards-loot-drop')):[];"
                    + "if(!root||!summary||!filters||!table||summary.hidden||tiles.length!==7)return false;"
                    + "var first=tiles[0].getBoundingClientRect();"
                    + "var style=getComputedStyle(summary);"
                    + "return tiles.length===7&&tiles.map(function(t){return t.dataset.rarity;}).join(',')==='weak,common,uncommon,rare,epic,legendary,mythical'"
                    + "&&tiles.every(function(t){var q=t.querySelector('.ppbui-cards-loot-drop-qty');return q&&/^×[0-9]/.test(q.textContent);})"
                    + "&&summary.previousElementSibling===filters&&summary.nextElementSibling===table"
                    + "&&style.display==='flex'&&style.overflowX==='auto'"
                    + "&&tiles.every(function(t){var r=t.getBoundingClientRect();return Math.abs(r.top-first.top)<=1&&r.width>=44;})"
                    + "&&new Set(tiles.map(function(t){return getComputedStyle(t).borderTopColor;})).size===7"
                    + "&&root.scrollWidth<=root.clientWidth+1;})()"
                );
                if (!string.Equals(verified, "true", StringComparison.Ordinal))
                {
                    var diagnostics = await pane.View.CoreWebView2.ExecuteScriptAsync(
                        "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                        + "var summary=document.querySelector('[data-card-loot-summary]');"
                        + "var filters=document.querySelector('.ppbui-cards-loot-filters');"
                        + "var table=document.querySelector('.ppbui-cards-loot-table');"
                        + "var tiles=summary?Array.from(summary.querySelectorAll('.ppbui-cards-loot-drop')):[];"
                        + "var rects=tiles.map(function(t){var r=t.getBoundingClientRect();return {w:r.width,top:r.top};});"
                        + "return JSON.stringify({count:tiles.length,order:tiles.map(function(t){return t.dataset.rarity;}).join(','),"
                        + "qty:tiles.map(function(t){var q=t.querySelector('.ppbui-cards-loot-drop-qty');return q?q.textContent:'';}),"
                        + "adjacent:Boolean(summary&&summary.previousElementSibling===filters&&summary.nextElementSibling===table),"
                        + "display:summary?getComputedStyle(summary).display:'',overflowX:summary?getComputedStyle(summary).overflowX:'',"
                        + "rects:rects,colors:tiles.map(function(t){return getComputedStyle(t).borderTopColor;}),"
                        + "rootClient:root?root.clientWidth:-1,rootScroll:root?root.scrollWidth:-1});})()"
                    );
                    throw new InvalidOperationException(
                        "Loot summary visual evidence failed geometry, order or rarity-border checks. diag="
                        + diagnostics
                    );
                }
            }

            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-loot-summary-dual-1600.png"),
                false
            );
            var constrainedVerified = await left.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var panel=document.querySelector('[data-card-story-panel=loot]');"
                + "var summary=document.querySelector('[data-card-loot-summary]');"
                + "var table=document.querySelector('.ppbui-cards-loot-table');"
                + "var first=summary&&summary.querySelector('.ppbui-cards-loot-drop');"
                + "if(!panel||!summary||!table||!first)return false;"
                + "panel.style.display='flex';panel.style.flexDirection='column';panel.style.height='126px';"
                + "table.style.flex='1 1 auto';table.style.minHeight='0';table.style.maxHeight='none';"
                + "var sr=summary.getBoundingClientRect(),tr=table.getBoundingClientRect(),ir=first.getBoundingClientRect();"
                + "var ok=sr.height>=ir.height&&ir.height>=46&&tr.top>=sr.bottom+4;"
                + "panel.style.removeProperty('display');panel.style.removeProperty('flex-direction');panel.style.removeProperty('height');"
                + "table.style.removeProperty('flex');table.style.removeProperty('min-height');table.style.removeProperty('max-height');"
                + "return ok;})()"
            );
            if (!string.Equals(constrainedVerified, "true", StringComparison.Ordinal))
                throw new InvalidOperationException(
                    "Loot summary collapsed under the history table in a constrained flex Story panel."
                );
            var narrowConfigured = await left.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                + "if(!root)return false;root.style.width='235px';root.style.right='auto';return true;})()"
            );
            if (!string.Equals(narrowConfigured, "true", StringComparison.Ordinal))
                throw new InvalidOperationException("Could not constrain synthetic Loot summary to 235px.");
            await Task.Delay(40);
            var narrowVerified = await left.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                + "var summary=document.querySelector('[data-card-loot-summary]');"
                + "var tiles=summary?Array.from(summary.querySelectorAll('.ppbui-cards-loot-drop')):[];"
                + "if(!root||!summary||tiles.length!==7)return false;"
                + "var top=tiles[0].getBoundingClientRect().top;"
                + "return getComputedStyle(summary).overflowX==='auto'"
                + "&&summary.scrollWidth>summary.clientWidth"
                + "&&tiles.every(function(t){return Math.abs(t.getBoundingClientRect().top-top)<=1;})"
                + "&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+1;})()"
            );
            if (!string.Equals(narrowVerified, "true", StringComparison.Ordinal))
            {
                var narrowDiagnostics = await left.View.CoreWebView2.ExecuteScriptAsync(
                    "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                    + "var summary=document.querySelector('[data-card-loot-summary]');"
                    + "var tiles=summary?Array.from(summary.querySelectorAll('.ppbui-cards-loot-drop')):[];"
                    + "return JSON.stringify({rootInlineWidth:root?root.style.width:'',"
                    + "rootComputedWidth:root?getComputedStyle(root).width:'',"
                    + "rootClient:root?root.clientWidth:-1,rootScroll:root?root.scrollWidth:-1,"
                    + "summaryClient:summary?summary.clientWidth:-1,summaryScroll:summary?summary.scrollWidth:-1,"
                    + "summaryWidth:summary?summary.getBoundingClientRect().width:-1,"
                    + "overflowX:summary?getComputedStyle(summary).overflowX:'',"
                    + "order:tiles.map(function(t){return t.dataset.rarity;}).join(','),"
                    + "rects:tiles.map(function(t){var r=t.getBoundingClientRect();return {w:r.width,top:r.top,left:r.left,right:r.right};}),"
                    + "documentClient:document.documentElement.clientWidth,documentScroll:document.documentElement.scrollWidth});})()"
                );
                throw new InvalidOperationException(
                    "Loot summary narrow evidence wrapped tiles or leaked horizontal overflow. diag="
                    + narrowDiagnostics
                );
            }
            await CaptureWorkspaceCompositeAsync(
                Path.Combine(outputDir, "workspace-cards-loot-summary-narrow-235.png"),
                false
            );
            await left.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');"
                + "if(root){root.style.removeProperty('width');root.style.removeProperty('right');}"
                + "return true;})()"
            );
            await Task.WhenAll(
                SetVisualStoryTabAsync(left, "hunt"),
                SetVisualStoryTabAsync(right, "hunt")
            );
            await Task.WhenAll(
                RestoreVisualCardsTopAsync(left),
                RestoreVisualCardsTopAsync(right)
            );
        }

        private async Task RestoreVisualCardsTopAsync(AccountPane pane)
        {
            if (pane == null || pane.View == null || pane.View.CoreWebView2 == null) return;
            await pane.View.CoreWebView2.ExecuteScriptAsync(
                "(function(){var root=document.querySelector('[data-ppbui-coupled-cards]');var table=document.querySelector('.ppbui-cards-attempt-table');if(root)root.scrollTop=0;if(table)table.scrollTop=0;return true;})()"
            );
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
            var expectedCardsView = beforeRecovery.CardsViewActive;
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
                || afterRecovery.CardsViewActive != expectedCardsView
                || _panesByProfile.Count != 2)
            {
                throw new InvalidOperationException("Active pane recovery violated profile/UDF/view isolation.");
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

        private void RunRepeatedFocusSettingsSmoke()
        {
            // Only the explicit local fixture bypasses the ordinary smoke
            // persistence guard. The real host writes only to its own store.
            var directory = Path.Combine(_baseDir, "smoke", "settings");
            Directory.CreateDirectory(directory);
            var path = Path.Combine(directory, "focus-probe-" + Guid.NewGuid().ToString("N") + ".json");
            var activeProfile = _workspaceState.ActiveProfileId;
            var originalScope = _workspaceState.CommandScope;
            var originalFingerprint = _lastSavedSettingsFingerprint;
            var originalRatio = _workspaceState.LayoutRatio;
            var originalLastRatio = _workspaceState.LastDualRatio;
            _smokeFocusSaveStore = new WorkspaceSettingsStore(path, phase =>
            {
                if (_smokeSaveFaultPhase == phase)
                    throw new IOException("Synthetic settings " + phase + " failure");
            });
            _smokeFocusSaveCalls = 0;
            _smokeFocusSaveProbe = true;
            try
            {
                if (_workspaceState.Mode == WorkspaceMode.Dual && !_split.Panel2Collapsed)
                {
                    _workspaceState.LayoutRatio = GetCurrentSplitRatio();
                    if (!_workspaceState.FocusMode)
                        _workspaceState.LastDualRatio = _workspaceState.LayoutRatio;
                }
                _lastSavedSettingsFingerprint = _smokeFocusSaveStore.NormalizedFingerprint(_workspaceState);
                SetActiveProfile(activeProfile);
                SetActiveProfile(activeProfile);
                if (_smokeFocusSaveCalls != 0 || File.Exists(path))
                    throw new InvalidOperationException("Repeated focus with unchanged state wrote settings.");

                _workspaceState.CommandScope = originalScope == CommandScope.Both
                    ? CommandScope.Active : CommandScope.Both;
                SetActiveProfile(activeProfile);
                if (_smokeFocusSaveCalls != 1 || !File.Exists(path))
                    throw new InvalidOperationException("Changed state was not persisted.");
                var persisted = File.ReadAllText(path);
                SetActiveProfile(activeProfile);
                if (_smokeFocusSaveCalls != 1 || File.ReadAllText(path) != persisted)
                    throw new InvalidOperationException("Repeated focus rewrote unchanged settings.");

                foreach (WorkspaceSavePhase phase in Enum.GetValues(typeof(WorkspaceSavePhase)))
                {
                    _workspaceState.CommandScope = _workspaceState.CommandScope == CommandScope.Both
                        ? CommandScope.Active : CommandScope.Both;
                    var lastGood = _lastSavedSettingsFingerprint;
                    var attempts = _smokeFocusSaveCalls;
                    _smokeSaveFaultPhase = phase;
                    var failed = false;
                    try { SetActiveProfile(activeProfile); }
                    catch (IOException) { failed = true; }
                    if (!failed || _smokeFocusSaveCalls != attempts + 1
                        || _lastSavedSettingsFingerprint != lastGood
                        || File.ReadAllText(path) != persisted
                        || File.Exists(path + ".tmp"))
                        throw new InvalidOperationException("Settings " + phase + " failure lost the last good state.");
                    _smokeSaveFaultPhase = null;
                    SetActiveProfile(activeProfile);
                    if (_smokeFocusSaveCalls != attempts + 2 || _lastSavedSettingsFingerprint == lastGood)
                        throw new InvalidOperationException("Settings " + phase + " failure was not retried.");
                    persisted = File.ReadAllText(path);
                }
                Console.WriteLine("CW-PERF-005 repeated-focus persistence and three failure retries: PASS");
            }
            finally
            {
                _smokeSaveFaultPhase = null;
                _smokeFocusSaveProbe = false;
                _smokeFocusSaveStore = null;
                _lastSavedSettingsFingerprint = originalFingerprint;
                _workspaceState.CommandScope = originalScope;
                _workspaceState.LayoutRatio = originalRatio;
                _workspaceState.LastDualRatio = originalLastRatio;
                UpdateCommandDeck();
            }
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
            state.ZoomByProfile[ProfileRegistry.Rhyosa.Id] = 0.90;
            state.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id][0] = "hunt-analyzer";
            state.QuickSurfacesByProfile[ProfileRegistry.Rhyosa.Id][0] = "guild";
            state.CardsViewByProfile[ProfileRegistry.Rhyxus.Id] = false;
            state.CardsViewByProfile[ProfileRegistry.Rhyosa.Id] = true;
            state.MaintenanceDrawerExpanded = true;

            var perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
            try { store.Save(state); }
            finally
            {
                if (_perfMetrics != null)
                    _perfMetrics.Observe(WorkspacePerfSpan.SyntheticSettingsSave, perfStarted);
            }
            var loaded = store.LoadOrDefault();
            if (loaded.Mode != WorkspaceMode.Single
                || !string.Equals(loaded.SingleProfileId, ProfileRegistry.Rhyosa.Id, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(loaded.ActiveProfileId, ProfileRegistry.Rhyosa.Id, StringComparison.OrdinalIgnoreCase)
                || loaded.CommandScope != CommandScope.Both
                || Math.Abs(loaded.LayoutRatio - 0.33) > 0.0001
                || Math.Abs(loaded.LastDualRatio - 0.67) > 0.0001
                || Math.Abs(loaded.ZoomByProfile[ProfileRegistry.Rhyxus.Id] - 1.25) > 0.0001
                || Math.Abs(loaded.ZoomByProfile[ProfileRegistry.Rhyosa.Id] - 0.90) > 0.0001
                || loaded.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id][0] != "hunt-analyzer"
                || loaded.QuickSurfacesByProfile[ProfileRegistry.Rhyosa.Id][0] != "guild"
                || loaded.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id].Count != 7
                || loaded.CardsViewByProfile[ProfileRegistry.Rhyxus.Id]
                || !loaded.CardsViewByProfile[ProfileRegistry.Rhyosa.Id]
                || !loaded.MaintenanceDrawerExpanded)
            {
                throw new InvalidOperationException("Workspace settings round-trip failed.");
            }

            var malformed = WorkspaceState.CreateBaseline();
            malformed.LayoutRatio = double.NaN;
            malformed.LastDualRatio = 9.0;
            malformed.ZoomByProfile[ProfileRegistry.Rhyxus.Id] = 99.0;
            malformed.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id] =
                new List<string> { "hunts", "hunts", "unsafe-unknown", "guild" };
            malformed.CardsViewByProfile.Remove(ProfileRegistry.Rhyosa.Id);
            malformed.ActiveProfileId = "unknown-profile";
            var normalized = store.Normalize(malformed);
            if (Math.Abs(normalized.LayoutRatio - 0.5) > 0.0001
                || Math.Abs(normalized.LastDualRatio - 0.8) > 0.0001
                || Math.Abs(normalized.ZoomByProfile[ProfileRegistry.Rhyxus.Id] - 1.25) > 0.0001
                || normalized.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id].Count != 7
                || normalized.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id][0] != "hunts"
                || normalized.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id][1] != "guild"
                || normalized.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id].Contains("unsafe-unknown")
                || !normalized.CardsViewByProfile[ProfileRegistry.Rhyosa.Id]
                || !string.Equals(normalized.ActiveProfileId, normalized.LeftProfileId, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Workspace settings normalization failed.");
            }

            File.WriteAllText(settingsPath,
                "{\"version\":2,\"mode\":\"dual\",\"activeProfileId\":\"rhyxus\","
                + "\"quickSurfacesByProfile\":["
                + "{\"profileId\":\"rhyxus\",\"surfaceIds\":["
                + "\"HUNT-ANALYZER\",\"HuNt-AnAlYzEr\",\"InVeNtOrY\",\"gUiLd\","
                + "\"TEAM\",\"STORAGE\",\"AUTO-HELPER\",\"settings\"]},"
                + "{\"profileId\":\"rhyosa\",\"surfaceIds\":["
                + "\"NPC-SHOP\",\"hunts\",\"TeAm\",\"STORAGE\",\"settings\","
                + "\"auto-helper\",\"GUILD\"]}]}"
            );
            var mixedCase = store.LoadOrDefault();
            var rhyxusQuick = mixedCase.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id];
            var rhyosaQuick = mixedCase.QuickSurfacesByProfile[ProfileRegistry.Rhyosa.Id];
            if (string.Join(",", rhyxusQuick.ToArray())
                    != "hunt-analyzer,inventory,guild,team,storage,auto-helper,settings"
                || string.Join(",", rhyosaQuick.ToArray())
                    != "npc-shop,hunts,team,storage,settings,auto-helper,guild"
                || rhyxusQuick.Count != 7 || rhyosaQuick.Count != 7)
                throw new InvalidOperationException("Version-2 mixed-case quick destinations were not canonicalized.");
            perfStarted = _perfMetrics == null ? 0 : _perfMetrics.Start();
            try { store.Save(mixedCase); }
            finally
            {
                if (_perfMetrics != null)
                    _perfMetrics.Observe(WorkspacePerfSpan.SyntheticSettingsSave, perfStarted);
            }
            var persistedJson = File.ReadAllText(settingsPath);
            var reloaded = store.LoadOrDefault();
            if (persistedJson.IndexOf("HUNT-ANALYZER", StringComparison.Ordinal) >= 0
                || persistedJson.IndexOf("NPC-SHOP", StringComparison.Ordinal) >= 0
                || string.Join(",", reloaded.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id].ToArray())
                    != string.Join(",", rhyxusQuick.ToArray())
                || string.Join(",", reloaded.QuickSurfacesByProfile[ProfileRegistry.Rhyosa.Id].ToArray())
                    != string.Join(",", rhyosaQuick.ToArray()))
                throw new InvalidOperationException("Version-2 mixed-case quick destinations regressed after round-trip.");

            File.WriteAllText(settingsPath,
                "{\"version\":1,\"mode\":\"single\",\"singleProfileId\":\"rhyosa\","
                + "\"activeProfileId\":\"rhyosa\",\"zoomByProfile\":[{\"profileId\":\"rhyxus\",\"factor\":1.25}],"
                + "\"cardsViewByProfile\":[{\"profileId\":\"rhyxus\",\"cards\":false}]}"
            );
            var legacy = store.LoadOrDefault();
            if (legacy.Version != WorkspaceSettingsStore.CurrentVersion
                || legacy.Mode != WorkspaceMode.Single
                || legacy.ActiveProfileId != ProfileRegistry.Rhyosa.Id
                || Math.Abs(legacy.ZoomByProfile[ProfileRegistry.Rhyxus.Id] - 1.25) > 0.0001
                || legacy.CardsViewByProfile[ProfileRegistry.Rhyxus.Id]
                || legacy.QuickSurfacesByProfile[ProfileRegistry.Rhyxus.Id][0] != "inventory")
                throw new InvalidOperationException("Version-1 settings migration lost existing user preferences.");

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
        private static readonly IntPtr DpiAwarenessContextPerMonitorAwareV2 = new IntPtr(-4);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetProcessDpiAwarenessContext(IntPtr dpiContext);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetProcessDPIAware();

        [STAThread]
        private static void Main(string[] args)
        {
            EnableDpiAwareness();
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            WorkspaceSavePhase? shutdownSaveSmokePhase = null;
            var shutdownSaveSuccessSmoke = false;
            var requestedShutdownFaultFlags = 0;
            if (args != null)
            {
                foreach (var argument in args)
                {
                    if (!argument.StartsWith("--smoke-shutdown-save-", StringComparison.Ordinal)) continue;
                    requestedShutdownFaultFlags++;
                    if (argument == "--smoke-shutdown-save-create")
                        shutdownSaveSmokePhase = WorkspaceSavePhase.Create;
                    else if (argument == "--smoke-shutdown-save-flush")
                        shutdownSaveSmokePhase = WorkspaceSavePhase.Flush;
                    else if (argument == "--smoke-shutdown-save-replace")
                        shutdownSaveSmokePhase = WorkspaceSavePhase.Replace;
                    else if (argument == "--smoke-shutdown-save-success")
                        shutdownSaveSuccessSmoke = true;
                    else
                    {
                        Console.Error.WriteLine("Unknown synthetic shutdown fault stage.");
                        Environment.ExitCode = 2;
                        return;
                    }
                }
            }
            if (requestedShutdownFaultFlags != 0
                && (requestedShutdownFaultFlags != 1 || (!shutdownSaveSmokePhase.HasValue && !shutdownSaveSuccessSmoke)
                    || args.Length != 3
                    || Array.IndexOf(args, "--smoke") < 0
                    || Array.IndexOf(args, "--perf-metrics") < 0
                    || !string.Equals(Path.GetFileName(Application.ExecutablePath),
                        "PokePixelCoupledWorkspace.candidate.exe", StringComparison.OrdinalIgnoreCase)))
            {
                Console.Error.WriteLine("Shutdown fault fixture requires candidate --smoke --perf-metrics and one exclusive stage.");
                Environment.ExitCode = 2;
                return;
            }
            var shutdownDuringInitSmoke =
                args != null && Array.IndexOf(args, "--smoke-close-during-init") >= 0;
            var shutdownDuringSwitchSmoke =
                args != null && Array.IndexOf(args, "--smoke-close-during-switch") >= 0;
            var perfBaselineSmoke =
                args != null && Array.IndexOf(args, "--smoke-perf-baseline") >= 0;
            var perfCyclesSmoke =
                args != null && Array.IndexOf(args, "--smoke-perf-cycles") >= 0;
            var perfIdleCardsSmoke =
                args != null && Array.IndexOf(args, "--smoke-perf-idle-cards") >= 0;
            var perfIdleGameSmoke =
                args != null && Array.IndexOf(args, "--smoke-perf-idle-game") >= 0;
            var perfIdleMixedSmoke =
                args != null && Array.IndexOf(args, "--smoke-perf-idle-mixed") >= 0;
            var perfIdlePreflightSmoke =
                args != null && Array.IndexOf(args, "--smoke-perf-idle-preflight") >= 0;
            var perfVisibleFocusSmoke =
                args != null && Array.IndexOf(args, "--smoke-perf-focus-visible") >= 0;
            var perfExtendedVisualSmoke =
                args != null && Array.IndexOf(args, "--smoke-visual-extended") >= 0;
            var perfIdleSmoke = perfIdleCardsSmoke || perfIdleGameSmoke || perfIdleMixedSmoke;
            var smoke =
                shutdownDuringInitSmoke
                || shutdownDuringSwitchSmoke
                || perfBaselineSmoke
                || perfCyclesSmoke
                || perfVisibleFocusSmoke
                || perfExtendedVisualSmoke
                || perfIdlePreflightSmoke
                || perfIdleSmoke
                || (args != null && Array.IndexOf(args, "--smoke") >= 0);
            var evidenceProbe =
                args != null && Array.IndexOf(args, "--evidence-probe") >= 0;
            var perfMetricsEnabled = args != null && Array.IndexOf(args, "--perf-metrics") >= 0;
            if ((perfBaselineSmoke && (shutdownDuringInitSmoke || shutdownDuringSwitchSmoke || perfVisibleFocusSmoke || perfIdlePreflightSmoke || perfExtendedVisualSmoke))
                || (perfCyclesSmoke && (perfBaselineSmoke || shutdownDuringInitSmoke || shutdownDuringSwitchSmoke || perfVisibleFocusSmoke || perfIdlePreflightSmoke || perfExtendedVisualSmoke)))
            {
                Console.Error.WriteLine("Performance smoke variants are mutually exclusive with each other and shutdown-only modes.");
                Environment.ExitCode = 2;
                return;
            }
            if (((int)(perfIdleCardsSmoke ? 1 : 0) + (int)(perfIdleGameSmoke ? 1 : 0)
                    + (int)(perfIdleMixedSmoke ? 1 : 0) > 1)
                || (perfIdleSmoke && (perfBaselineSmoke || perfCyclesSmoke || shutdownDuringInitSmoke || shutdownDuringSwitchSmoke || perfVisibleFocusSmoke || perfIdlePreflightSmoke || perfExtendedVisualSmoke))
                || (perfVisibleFocusSmoke && (shutdownDuringInitSmoke || shutdownDuringSwitchSmoke || perfIdlePreflightSmoke || perfExtendedVisualSmoke))
                || (perfIdlePreflightSmoke && (shutdownDuringInitSmoke || shutdownDuringSwitchSmoke || perfExtendedVisualSmoke))
                || (perfExtendedVisualSmoke && (shutdownDuringInitSmoke || shutdownDuringSwitchSmoke)))
            {
                Console.Error.WriteLine("Idle performance smoke variants are mutually exclusive with other synthetic variants.");
                Environment.ExitCode = 2;
                return;
            }
            if ((perfBaselineSmoke || perfCyclesSmoke || perfIdleSmoke || perfVisibleFocusSmoke || perfIdlePreflightSmoke || perfExtendedVisualSmoke) && evidenceProbe)
            {
                Console.Error.WriteLine(
                    "Performance smoke variants require isolated synthetic execution without evidence flags.");
                Environment.ExitCode = 2;
                return;
            }
            // CW-PERF-001 is synthetic-only. Never let a metrics flag turn a
            // normal/live workspace into an implicit game profiling session.
            if (perfMetricsEnabled && (!smoke || evidenceProbe))
            {
                Console.Error.WriteLine(
                    "--perf-metrics requires synthetic --smoke without evidence; live game profiling is disabled.");
                Environment.ExitCode = 2;
                return;
            }
            if ((perfVisibleFocusSmoke || perfIdlePreflightSmoke || perfExtendedVisualSmoke) && !perfMetricsEnabled)
            {
                Console.Error.WriteLine("Focus/idle-preflight/extended-visual synthetic variants require --perf-metrics.");
                Environment.ExitCode = 2;
                return;
            }
            ThreadExceptionEventHandler smokeThreadException = null;
            if (smoke)
            {
                Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                smokeThreadException = delegate(object sender, ThreadExceptionEventArgs eventArgs)
                {
                    Console.Error.WriteLine(
                        "WebView2 smoke UI-thread exception: " + eventArgs.Exception
                    );
                    Environment.ExitCode = 1;
                    Application.Exit();
                };
                Application.ThreadException += smokeThreadException;
            }
            var baseDir = AppDomain.CurrentDomain.BaseDirectory;
            try
            {
                Application.Run(
                    new WorkspaceForm(
                        baseDir,
                        smoke,
                        shutdownDuringInitSmoke,
                        shutdownDuringSwitchSmoke,
                        evidenceProbe,
                        perfMetricsEnabled,
                        perfBaselineSmoke,
                        perfCyclesSmoke,
                        perfIdleSmoke,
                        perfIdleGameSmoke,
                        perfIdleMixedSmoke,
                        perfIdlePreflightSmoke,
                        perfVisibleFocusSmoke,
                        perfExtendedVisualSmoke,
                        shutdownSaveSmokePhase,
                        shutdownSaveSuccessSmoke
                    )
                );
            }
            finally
            {
                if (smokeThreadException != null)
                    Application.ThreadException -= smokeThreadException;
            }
        }

        private static void EnableDpiAwareness()
        {
            try
            {
                if (SetProcessDpiAwarenessContext(DpiAwarenessContextPerMonitorAwareV2))
                    return;
            }
            catch (EntryPointNotFoundException)
            {
            }
            catch (DllNotFoundException)
            {
                return;
            }

            try
            {
                SetProcessDPIAware();
            }
            catch (EntryPointNotFoundException)
            {
            }
            catch (DllNotFoundException)
            {
            }
        }
    }
}
