using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Text;

namespace PokePixel.CoupledWorkspace
{
    // Opt-in, in-memory metrics only. Names are fixed enums so no URL, account,
    // browser message, game payload or user-data-folder can enter a report.
    internal enum WorkspacePerfSpan
    {
        EnvironmentCreate,
        ControllerInitialize,
        PaneSetup,
        PaneDispose,
        RegisterSmokeScript,
        RegisterAnalyzerScript,
        RegisterBetterUiScript,
        RegisterEvidenceScript,
        NavigationComplete,
        NavigationUiReadyProbe,
        SmokeNavigationUiReadyProbe,
        SyntheticSettingsSave,
        SettingsSave,
        GameDockUpdate,
        GameDockOverflowRebuild,
        FocusHandling,
        SmokeLifecycleCycle,
        SmokeFocusLayoutCycle
    }

    internal enum WorkspacePerfCounter
    {
        PaneCreated,
        PaneRecreated,
        PaneDisposed,
        NavigationStarted,
        NavigationSucceeded,
        NavigationFailed,
        UiReadyConfirmed,
        SmokeUiReadyConfirmed,
        FocusReceived,
        ActiveProfileChanged,
        SettingsSaveFailed,
        GameDockOverflowItemsCreated,
        PendingRequestAdded,
        PendingRequestResolved,
        PendingRequestPostFailed,
        PendingRequestCleared,
        ProcessFailed
    }

    internal sealed class WorkspacePerfMetrics
    {
        // A bounded *recent* sample set per span; totals and extrema cover all
        // samples. Quantiles in the report are explicitly labeled as recent.
        private const int RecentCapacity = 2048;
        private readonly object _gate = new object();
        private readonly SpanSummary[] _spans = new SpanSummary[Enum.GetValues(typeof(WorkspacePerfSpan)).Length];
        private readonly long[] _counts = new long[Enum.GetValues(typeof(WorkspacePerfCounter)).Length];
        private readonly HashSet<string> _everCreatedProfiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        private long _pendingNow;
        private long _pendingPeak;

        private sealed class SpanSummary
        {
            public long Count;
            public double TotalMs;
            public double MinMs = double.PositiveInfinity;
            public double MaxMs;
            public int Cursor;
            public readonly double[] Recent = new double[RecentCapacity];

            public void Add(double milliseconds)
            {
                Count++;
                TotalMs += milliseconds;
                MinMs = Math.Min(MinMs, milliseconds);
                MaxMs = Math.Max(MaxMs, milliseconds);
                Recent[Cursor++ % RecentCapacity] = milliseconds;
            }

            public string Format()
            {
                var available = (int)Math.Min(Count, RecentCapacity);
                var samples = new double[available];
                Array.Copy(Recent, samples, available);
                Array.Sort(samples);
                return "n=" + Count.ToString(CultureInfo.InvariantCulture)
                    + " mean_ms=" + Number(TotalMs / Count)
                    + " min_ms=" + Number(MinMs)
                    + " max_ms=" + Number(MaxMs)
                    + " p50_recent_ms=" + Number(Percentile(samples, 0.50))
                    + " p95_recent_ms=" + Number(Percentile(samples, 0.95))
                    + " recent_n=" + available.ToString(CultureInfo.InvariantCulture);
            }

            private static double Percentile(double[] sorted, double percentile)
            {
                if (sorted.Length == 1) return sorted[0];
                var index = (sorted.Length - 1) * percentile;
                var lower = (int)Math.Floor(index);
                var upper = (int)Math.Ceiling(index);
                return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
            }
        }

        private static string Number(double value)
        {
            return value.ToString("0.000", CultureInfo.InvariantCulture);
        }

        public long Start()
        {
            return Stopwatch.GetTimestamp();
        }

        public void Observe(WorkspacePerfSpan span, long startedAt)
        {
            if (startedAt <= 0) return;
            var elapsedTicks = Stopwatch.GetTimestamp() - startedAt;
            if (elapsedTicks < 0) return;
            var milliseconds = elapsedTicks * (1000.0 / Stopwatch.Frequency);
            lock (_gate)
            {
                var index = (int)span;
                if (_spans[index] == null) _spans[index] = new SpanSummary();
                _spans[index].Add(milliseconds);
            }
        }

        public void Count(WorkspacePerfCounter counter, long amount = 1)
        {
            if (amount <= 0) return;
            lock (_gate) _counts[(int)counter] += amount;
        }

        public void PaneCreated(string profileId)
        {
            lock (_gate)
            {
                _counts[(int)WorkspacePerfCounter.PaneCreated]++;
                if (!_everCreatedProfiles.Add(profileId))
                    _counts[(int)WorkspacePerfCounter.PaneRecreated]++;
            }
        }

        public void SetPendingCount(int count)
        {
            lock (_gate)
            {
                _pendingNow = Math.Max(0, count);
                _pendingPeak = Math.Max(_pendingPeak, _pendingNow);
            }
        }

        // The caller chooses an allowlisted mode. Neither the report nor this
        // collector reads URLs, profile names, credentials or browser content.
        public string Snapshot(string mode, int paneCount, int pendingCount)
        {
            lock (_gate)
            {
                _pendingNow = Math.Max(0, pendingCount);
                _pendingPeak = Math.Max(_pendingPeak, _pendingNow);
                var output = new StringBuilder();
                output.AppendLine("CW-PERF-001 opt-in aggregate; no network/user data; quantiles are last 2048 samples per span");
                output.Append("mode=").AppendLine(mode);
                output.Append("panes_current=").AppendLine(paneCount.ToString(CultureInfo.InvariantCulture));
                output.Append("pending_current=").AppendLine(_pendingNow.ToString(CultureInfo.InvariantCulture));
                output.Append("pending_peak=").AppendLine(_pendingPeak.ToString(CultureInfo.InvariantCulture));
                for (var i = 0; i < _counts.Length; i++)
                {
                    if (_counts[i] == 0) continue;
                    output.Append("count.").Append(((WorkspacePerfCounter)i).ToString())
                        .Append('=').AppendLine(_counts[i].ToString(CultureInfo.InvariantCulture));
                }
                for (var i = 0; i < _spans.Length; i++)
                {
                    if (_spans[i] == null || _spans[i].Count == 0) continue;
                    output.Append("span.").Append(((WorkspacePerfSpan)i).ToString())
                        .Append(' ').AppendLine(_spans[i].Format());
                }
                return output.ToString().TrimEnd();
            }
        }
    }
}
