using System;
using System.Collections.Generic;

namespace PokePixel.CoupledWorkspace
{
    internal enum WorkspaceMode
    {
        Single,
        Dual
    }

    internal enum PaneSide
    {
        Left,
        Right
    }

    internal enum CommandScope
    {
        Active,
        Both
    }

    internal sealed class ProfileDefinition
    {
        public ProfileDefinition(string id, string displayName, string userDataFolderName)
        {
            if (string.IsNullOrWhiteSpace(id)) throw new ArgumentException("Profile id is required.", "id");
            if (string.IsNullOrWhiteSpace(displayName)) throw new ArgumentException("Profile display name is required.", "displayName");
            if (string.IsNullOrWhiteSpace(userDataFolderName)) throw new ArgumentException("Profile user-data folder is required.", "userDataFolderName");

            Id = id;
            DisplayName = displayName;
            UserDataFolderName = userDataFolderName;
        }

        public string Id { get; private set; }
        public string DisplayName { get; private set; }
        public string UserDataFolderName { get; private set; }

        public override string ToString()
        {
            return DisplayName;
        }
    }

    internal static class ProfileRegistry
    {
        public static readonly ProfileDefinition Rhyxus =
            new ProfileDefinition("rhyxus", "Rhyxus", "Rhyxus");

        public static readonly ProfileDefinition Rhyosa =
            new ProfileDefinition("rhyosa", "Rhyosa", "Rhyosa");

        private static readonly Dictionary<string, ProfileDefinition> ById =
            new Dictionary<string, ProfileDefinition>(StringComparer.OrdinalIgnoreCase)
            {
                { Rhyxus.Id, Rhyxus },
                { Rhyosa.Id, Rhyosa }
            };

        public static ProfileDefinition Get(string id)
        {
            ProfileDefinition profile;
            if (id == null || !ById.TryGetValue(id, out profile))
                throw new InvalidOperationException("Unknown workspace profile: " + (id ?? "<null>"));
            return profile;
        }

        public static bool TryGet(string id, out ProfileDefinition profile)
        {
            if (id == null)
            {
                profile = null;
                return false;
            }

            return ById.TryGetValue(id, out profile);
        }

        public static ProfileDefinition[] All()
        {
            return new[] { Rhyxus, Rhyosa };
        }

        public static void Validate()
        {
            if (string.Equals(Rhyxus.Id, Rhyosa.Id, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Workspace profile IDs must be distinct.");

            if (string.Equals(
                Rhyxus.UserDataFolderName,
                Rhyosa.UserDataFolderName,
                StringComparison.OrdinalIgnoreCase
            ))
            {
                throw new InvalidOperationException("Workspace profile user-data folders must be distinct.");
            }
        }
    }

    internal static class WorkspaceQuickSurfaceCatalog
    {
        public static readonly KeyValuePair<string, string>[] Default =
        {
            new KeyValuePair<string, string>("inventory", "Inventory"),
            new KeyValuePair<string, string>("hunts", "Hunts"),
            new KeyValuePair<string, string>("npc-shop", "Mark's Shop"),
            new KeyValuePair<string, string>("team", "Team"),
            new KeyValuePair<string, string>("storage", "Storage"),
            new KeyValuePair<string, string>("auto-helper", "Auto Helper"),
            new KeyValuePair<string, string>("settings", "Settings")
        };

        public static readonly KeyValuePair<string, string>[] All =
        {
            new KeyValuePair<string, string>("inventory", "Inventory"),
            new KeyValuePair<string, string>("hunts", "Hunts"),
            new KeyValuePair<string, string>("team", "Team"),
            new KeyValuePair<string, string>("profile", "Profile"),
            new KeyValuePair<string, string>("encyclopedia", "Pok\u00E9dex"),
            new KeyValuePair<string, string>("species-goals", "Mastery"),
            new KeyValuePair<string, string>("promotion", "Promotion"),
            new KeyValuePair<string, string>("npc-shop", "Mark's Shop"),
            new KeyValuePair<string, string>("market", "Market"),
            new KeyValuePair<string, string>("storage", "Storage"),
            new KeyValuePair<string, string>("professions", "Professions"),
            new KeyValuePair<string, string>("quests", "Quests"),
            new KeyValuePair<string, string>("battle-pass", "Battle Pass"),
            new KeyValuePair<string, string>("daily-gift", "Daily Login"),
            new KeyValuePair<string, string>("event-calendar", "Event Calendar"),
            new KeyValuePair<string, string>("arena-pvp", "Ranked PvP"),
            new KeyValuePair<string, string>("world-boss", "World Boss"),
            new KeyValuePair<string, string>("friends", "Friends"),
            new KeyValuePair<string, string>("guild", "Guild"),
            new KeyValuePair<string, string>("ranking", "Ranking"),
            new KeyValuePair<string, string>("shiny-captures", "Shiny Captures"),
            new KeyValuePair<string, string>("streamer-referral", "Partner"),
            new KeyValuePair<string, string>("private-message", "Mailbox"),
            new KeyValuePair<string, string>("hunt-analyzer", "Hunt Analyzer"),
            new KeyValuePair<string, string>("capture-records", "Capture Records"),
            new KeyValuePair<string, string>("auto-helper", "Auto Helper"),
            new KeyValuePair<string, string>("offline-farm", "Farm Off"),
            new KeyValuePair<string, string>("mini-view", "Mini view"),
            new KeyValuePair<string, string>("game-admin", "Administration"),
            new KeyValuePair<string, string>("premium", "Premium Shop"),
            new KeyValuePair<string, string>("beta-goals", "Pack"),
            new KeyValuePair<string, string>("gacha", "Gacha"),
            new KeyValuePair<string, string>("settings", "Settings")
        };

        public static bool TryGetLabel(string id, out string label)
        {
            foreach (var definition in All)
            {
                if (string.Equals(definition.Key, id, StringComparison.OrdinalIgnoreCase))
                {
                    label = definition.Value;
                    return true;
                }
            }
            label = null;
            return false;
        }

        public static bool TryGetCanonicalId(string id, out string canonicalId)
        {
            foreach (var definition in All)
            {
                if (!string.Equals(definition.Key, id, StringComparison.OrdinalIgnoreCase)) continue;
                canonicalId = definition.Key;
                return true;
            }
            canonicalId = null;
            return false;
        }

        public static List<string> CreateDefault()
        {
            var ids = new List<string>();
            foreach (var definition in Default) ids.Add(definition.Key);
            return ids;
        }
    }

    internal static class WorkspaceZoomPresets
    {
        public static readonly double[] Factors = { 0.90, 1.00, 1.10, 1.25 };

        public static double Normalize(double factor)
        {
            if (double.IsNaN(factor) || double.IsInfinity(factor)) return 1.00;
            var closest = 1.00;
            var distance = double.MaxValue;
            foreach (var preset in Factors)
            {
                var difference = Math.Abs(factor - preset);
                if (difference < distance)
                {
                    closest = preset;
                    distance = difference;
                }
            }
            return closest;
        }
    }

    internal sealed class WorkspaceState
    {
        public int Version { get; set; }
        public WorkspaceMode Mode { get; set; }
        public string SingleProfileId { get; set; }
        public string LeftProfileId { get; set; }
        public string RightProfileId { get; set; }
        public string ActiveProfileId { get; set; }
        public CommandScope CommandScope { get; set; }
        public double LayoutRatio { get; set; }
        public double LastDualRatio { get; set; }
        public bool FocusMode { get; set; }
        public Dictionary<string, double> ZoomByProfile { get; set; }
        public Dictionary<string, List<string>> QuickSurfacesByProfile { get; set; }
        public Dictionary<string, bool> CardsViewByProfile { get; set; }
        public bool MaintenanceDrawerExpanded { get; set; }

        public static WorkspaceState CreateBaseline()
        {
            return new WorkspaceState
            {
                Version = WorkspaceSettingsStore.CurrentVersion,
                Mode = WorkspaceMode.Dual,
                SingleProfileId = ProfileRegistry.Rhyxus.Id,
                LeftProfileId = ProfileRegistry.Rhyxus.Id,
                RightProfileId = ProfileRegistry.Rhyosa.Id,
                ActiveProfileId = ProfileRegistry.Rhyxus.Id,
                CommandScope = CommandScope.Active,
                LayoutRatio = 0.5,
                LastDualRatio = 0.5,
                FocusMode = false,
                ZoomByProfile = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase)
                {
                    { ProfileRegistry.Rhyxus.Id, 1.0 },
                    { ProfileRegistry.Rhyosa.Id, 1.0 }
                },
                QuickSurfacesByProfile = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase)
                {
                    { ProfileRegistry.Rhyxus.Id, WorkspaceQuickSurfaceCatalog.CreateDefault() },
                    { ProfileRegistry.Rhyosa.Id, WorkspaceQuickSurfaceCatalog.CreateDefault() }
                },
                CardsViewByProfile = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
                {
                    { ProfileRegistry.Rhyxus.Id, true },
                    { ProfileRegistry.Rhyosa.Id, true }
                },
                MaintenanceDrawerExpanded = false
            };
        }
    }
}
