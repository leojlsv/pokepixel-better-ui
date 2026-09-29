using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;

namespace PokePixel.CoupledWorkspace
{
    internal sealed class WorkspaceSettingsStore
    {
        public const int CurrentVersion = 2;

        private readonly string _path;

        public WorkspaceSettingsStore(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Settings path is required.", "path");
            _path = path;
        }

        public WorkspaceState LoadOrDefault()
        {
            if (!File.Exists(_path)) return WorkspaceState.CreateBaseline();

            try
            {
                WorkspaceSettingsDocument document;
                var serializer = CreateSerializer();
                using (var stream = File.OpenRead(_path))
                {
                    document = serializer.ReadObject(stream) as WorkspaceSettingsDocument;
                }

                if (document == null || (document.Version != 1 && document.Version != CurrentVersion))
                    return WorkspaceState.CreateBaseline();

                return FromDocument(document);
            }
            catch
            {
                return WorkspaceState.CreateBaseline();
            }
        }

        public void Save(WorkspaceState state)
        {
            if (state == null) throw new ArgumentNullException("state");

            var normalized = Normalize(state);
            var document = ToDocument(normalized);
            var directory = Path.GetDirectoryName(_path);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);

            var tempPath = _path + ".tmp";
            var serializer = CreateSerializer();
            using (var stream = File.Create(tempPath))
            {
                serializer.WriteObject(stream, document);
                stream.Flush();
            }

            try
            {
                if (File.Exists(_path))
                {
                    File.Replace(tempPath, _path, null, true);
                }
                else
                {
                    File.Move(tempPath, _path);
                }
            }
            finally
            {
                if (File.Exists(tempPath)) File.Delete(tempPath);
            }
        }

        public WorkspaceState Normalize(WorkspaceState state)
        {
            var baseline = WorkspaceState.CreateBaseline();
            if (state == null) return baseline;

            var normalized = WorkspaceState.CreateBaseline();
            normalized.Version = CurrentVersion;
            normalized.Mode = state.Mode == WorkspaceMode.Single ? WorkspaceMode.Single : WorkspaceMode.Dual;

            ProfileDefinition profile;
            normalized.SingleProfileId = ProfileRegistry.TryGet(state.SingleProfileId, out profile)
                ? profile.Id
                : baseline.SingleProfileId;

            ProfileDefinition leftProfile;
            ProfileDefinition rightProfile;
            var leftValid = ProfileRegistry.TryGet(state.LeftProfileId, out leftProfile);
            var rightValid = ProfileRegistry.TryGet(state.RightProfileId, out rightProfile);
            if (leftValid && rightValid && !string.Equals(leftProfile.Id, rightProfile.Id, StringComparison.OrdinalIgnoreCase))
            {
                normalized.LeftProfileId = leftProfile.Id;
                normalized.RightProfileId = rightProfile.Id;
            }
            else
            {
                normalized.LeftProfileId = baseline.LeftProfileId;
                normalized.RightProfileId = baseline.RightProfileId;
            }

            ProfileDefinition activeProfile;
            var activeValid = ProfileRegistry.TryGet(state.ActiveProfileId, out activeProfile);
            if (normalized.Mode == WorkspaceMode.Single)
            {
                normalized.ActiveProfileId = normalized.SingleProfileId;
                normalized.FocusMode = false;
            }
            else
            {
                normalized.ActiveProfileId = activeValid
                    && (string.Equals(activeProfile.Id, normalized.LeftProfileId, StringComparison.OrdinalIgnoreCase)
                        || string.Equals(activeProfile.Id, normalized.RightProfileId, StringComparison.OrdinalIgnoreCase))
                    ? activeProfile.Id
                    : normalized.LeftProfileId;
                normalized.FocusMode = state.FocusMode;
            }

            normalized.CommandScope = state.CommandScope == CommandScope.Both
                ? CommandScope.Both
                : CommandScope.Active;

            normalized.LayoutRatio = ClampRatio(state.LayoutRatio, baseline.LayoutRatio);
            normalized.LastDualRatio = ClampRatio(state.LastDualRatio, baseline.LastDualRatio);

            normalized.ZoomByProfile = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            foreach (var registered in ProfileRegistry.All())
            {
                double value;
                if (state.ZoomByProfile != null && state.ZoomByProfile.TryGetValue(registered.Id, out value))
                    normalized.ZoomByProfile[registered.Id] = WorkspaceZoomPresets.Normalize(value);
                else
                    normalized.ZoomByProfile[registered.Id] = 1.0;
            }

            normalized.QuickSurfacesByProfile = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
            foreach (var registered in ProfileRegistry.All())
            {
                List<string> requested;
                if (state.QuickSurfacesByProfile == null
                    || !state.QuickSurfacesByProfile.TryGetValue(registered.Id, out requested))
                    requested = null;
                normalized.QuickSurfacesByProfile[registered.Id] = NormalizeQuickSurfaces(requested);
            }

            normalized.CardsViewByProfile = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
            foreach (var registered in ProfileRegistry.All())
            {
                bool cards;
                normalized.CardsViewByProfile[registered.Id] = state.CardsViewByProfile != null
                    && state.CardsViewByProfile.TryGetValue(registered.Id, out cards)
                        ? cards
                        : true;
            }

            normalized.MaintenanceDrawerExpanded = state.MaintenanceDrawerExpanded;
            return normalized;
        }

        private static double ClampRatio(double value, double fallback)
        {
            if (double.IsNaN(value) || double.IsInfinity(value)) return fallback;
            return Math.Max(0.20, Math.Min(0.80, value));
        }

        private static List<string> NormalizeQuickSurfaces(IEnumerable<string> requested)
        {
            var result = new List<string>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (requested != null)
            {
                foreach (var id in requested)
                {
                    string canonicalId;
                    if (!WorkspaceQuickSurfaceCatalog.TryGetCanonicalId(id, out canonicalId)
                        || !seen.Add(canonicalId)) continue;
                    result.Add(canonicalId);
                    if (result.Count == WorkspaceQuickSurfaceCatalog.Default.Length) return result;
                }
            }
            foreach (var definition in WorkspaceQuickSurfaceCatalog.Default)
            {
                if (!seen.Add(definition.Key)) continue;
                result.Add(definition.Key);
                if (result.Count == WorkspaceQuickSurfaceCatalog.Default.Length) break;
            }
            return result;
        }

        private static DataContractJsonSerializer CreateSerializer()
        {
            return new DataContractJsonSerializer(typeof(WorkspaceSettingsDocument));
        }

        private static WorkspaceSettingsDocument ToDocument(WorkspaceState state)
        {
            var zoom = new List<ZoomSettingDocument>();
            var views = new List<ViewSettingDocument>();
            var favorites = new List<QuickSurfacesSettingDocument>();
            foreach (var profile in ProfileRegistry.All())
            {
                double factor;
                if (!state.ZoomByProfile.TryGetValue(profile.Id, out factor)) factor = 1.0;
                zoom.Add(new ZoomSettingDocument { ProfileId = profile.Id, Factor = factor });
                bool cards;
                if (!state.CardsViewByProfile.TryGetValue(profile.Id, out cards)) cards = true;
                views.Add(new ViewSettingDocument { ProfileId = profile.Id, Cards = cards });
                favorites.Add(new QuickSurfacesSettingDocument
                {
                    ProfileId = profile.Id,
                    SurfaceIds = new List<string>(state.QuickSurfacesByProfile[profile.Id])
                });
            }

            return new WorkspaceSettingsDocument
            {
                Version = CurrentVersion,
                Mode = state.Mode == WorkspaceMode.Single ? "single" : "dual",
                SingleProfileId = state.SingleProfileId,
                LeftProfileId = state.LeftProfileId,
                RightProfileId = state.RightProfileId,
                ActiveProfileId = state.ActiveProfileId,
                CommandScope = state.CommandScope == CommandScope.Both ? "both" : "active",
                LayoutRatio = state.LayoutRatio,
                LastDualRatio = state.LastDualRatio,
                FocusMode = state.FocusMode,
                ZoomByProfile = zoom,
                CardsViewByProfile = views,
                QuickSurfacesByProfile = favorites,
                MaintenanceDrawerExpanded = state.MaintenanceDrawerExpanded
            };
        }

        private WorkspaceState FromDocument(WorkspaceSettingsDocument document)
        {
            var state = WorkspaceState.CreateBaseline();
            state.Version = CurrentVersion;
            state.Mode = string.Equals(document.Mode, "single", StringComparison.OrdinalIgnoreCase)
                ? WorkspaceMode.Single
                : WorkspaceMode.Dual;
            state.SingleProfileId = document.SingleProfileId;
            state.LeftProfileId = document.LeftProfileId;
            state.RightProfileId = document.RightProfileId;
            state.ActiveProfileId = document.ActiveProfileId;
            state.CommandScope = string.Equals(document.CommandScope, "both", StringComparison.OrdinalIgnoreCase)
                ? CommandScope.Both
                : CommandScope.Active;
            state.LayoutRatio = document.LayoutRatio > 0
                ? document.LayoutRatio
                : state.LayoutRatio;
            state.LastDualRatio = document.LastDualRatio > 0
                ? document.LastDualRatio
                : state.LastDualRatio;
            state.FocusMode = document.FocusMode;
            state.MaintenanceDrawerExpanded = document.MaintenanceDrawerExpanded;
            state.ZoomByProfile = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            state.CardsViewByProfile = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
            state.QuickSurfacesByProfile = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

            if (document.ZoomByProfile != null)
            {
                foreach (var entry in document.ZoomByProfile)
                {
                    ProfileDefinition profile;
                    if (entry != null && ProfileRegistry.TryGet(entry.ProfileId, out profile))
                        state.ZoomByProfile[profile.Id] = entry.Factor;
                }
            }

            if (document.CardsViewByProfile != null)
            {
                foreach (var entry in document.CardsViewByProfile)
                {
                    ProfileDefinition profile;
                    if (entry != null && ProfileRegistry.TryGet(entry.ProfileId, out profile))
                        state.CardsViewByProfile[profile.Id] = entry.Cards;
                }
            }

            if (document.QuickSurfacesByProfile != null)
            {
                foreach (var entry in document.QuickSurfacesByProfile)
                {
                    ProfileDefinition profile;
                    if (entry != null && ProfileRegistry.TryGet(entry.ProfileId, out profile))
                        state.QuickSurfacesByProfile[profile.Id] = entry.SurfaceIds;
                }
            }

            return Normalize(state);
        }

        [DataContract]
        private sealed class WorkspaceSettingsDocument
        {
            [DataMember(Name = "version", Order = 1)] public int Version { get; set; }
            [DataMember(Name = "mode", Order = 2)] public string Mode { get; set; }
            [DataMember(Name = "singleProfileId", Order = 3)] public string SingleProfileId { get; set; }
            [DataMember(Name = "leftProfileId", Order = 4)] public string LeftProfileId { get; set; }
            [DataMember(Name = "rightProfileId", Order = 5)] public string RightProfileId { get; set; }
            [DataMember(Name = "activeProfileId", Order = 6)] public string ActiveProfileId { get; set; }
            [DataMember(Name = "layoutRatio", Order = 7)] public double LayoutRatio { get; set; }
            [DataMember(Name = "lastDualRatio", Order = 8)] public double LastDualRatio { get; set; }
            [DataMember(Name = "focusMode", Order = 9)] public bool FocusMode { get; set; }
            [DataMember(Name = "commandScope", Order = 10)] public string CommandScope { get; set; }
            [DataMember(Name = "zoomByProfile", Order = 11)] public List<ZoomSettingDocument> ZoomByProfile { get; set; }
            [DataMember(Name = "maintenanceDrawerExpanded", Order = 12)] public bool MaintenanceDrawerExpanded { get; set; }
            [DataMember(Name = "cardsViewByProfile", Order = 13, EmitDefaultValue = false)] public List<ViewSettingDocument> CardsViewByProfile { get; set; }
            [DataMember(Name = "quickSurfacesByProfile", Order = 14, EmitDefaultValue = false)] public List<QuickSurfacesSettingDocument> QuickSurfacesByProfile { get; set; }
        }

        [DataContract]
        private sealed class QuickSurfacesSettingDocument
        {
            [DataMember(Name = "profileId", Order = 1)] public string ProfileId { get; set; }
            [DataMember(Name = "surfaceIds", Order = 2)] public List<string> SurfaceIds { get; set; }
        }

        [DataContract]
        private sealed class ZoomSettingDocument
        {
            [DataMember(Name = "profileId", Order = 1)] public string ProfileId { get; set; }
            [DataMember(Name = "factor", Order = 2)] public double Factor { get; set; }
        }

        [DataContract]
        private sealed class ViewSettingDocument
        {
            [DataMember(Name = "profileId", Order = 1)] public string ProfileId { get; set; }
            [DataMember(Name = "cards", Order = 2)] public bool Cards { get; set; }
        }
    }
}
