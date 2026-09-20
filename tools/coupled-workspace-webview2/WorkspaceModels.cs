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
        public bool MaintenanceDrawerExpanded { get; set; }

        public static WorkspaceState CreateBaseline()
        {
            return new WorkspaceState
            {
                Version = 1,
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
                MaintenanceDrawerExpanded = false
            };
        }
    }
}
