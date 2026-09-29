using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace PokePixel.CoupledWorkspace
{
    // Isolated HTTP-public PPTools integration check using a synthetic attacker.
    // It does not open a game profile or navigate to the game domain.
    internal static class PptoolsRunnerSmoke
    {
        private sealed class InvisibleForm : Form
        {
            protected override bool ShowWithoutActivation { get { return true; } }
        }

        public static void Run(bool completeInput = false)
        {
            using (var owner = new InvisibleForm
            {
                Opacity = 0,
                ShowInTaskbar = false,
                StartPosition = FormStartPosition.Manual,
                FormBorderStyle = FormBorderStyle.None,
                Left = -32000,
                Top = -32000,
                Width = 1280,
                Height = 800
            })
            using (var timeout = new System.Windows.Forms.Timer { Interval = 240000 })
            {
                timeout.Tick += delegate
                {
                    timeout.Stop();
                    Console.Error.WriteLine("PPTools background runner: TIMEOUT");
                    Environment.ExitCode = 1;
                    owner.Close();
                };
                owner.Shown += async delegate
                {
                    timeout.Start();
                    try
                    {
                        var baseDir = AppDomain.CurrentDomain.BaseDirectory;
                        var executor = new PptoolsBackgroundExecutor(baseDir,
                            Path.Combine(Path.GetTempPath(), "ppbui-pptools-runner-smoke"), true);
                        if (!executor.Available) throw new InvalidOperationException("No site runner script available.");
                        var attacker = "{\"pokemon\":\"charmander\",\"level\":10,\"trainerLevel\":1,"
                            + "\"quality\":\"common\",\"ivs\":{\"hp\":20,\"atk\":20,\"def\":20,"
                            + "\"spAtk\":20,\"spDef\":20,\"speed\":20},\"nature\":\"adamant\","
                            + "\"gender\":\"male\",\"isShiny\":false,\"isStarter\":true}";
                        if (completeInput)
                        {
                            // Public PPTools fixture values, never read from a live game.
                            attacker = "{\"pokemon\":\"wartortle\",\"level\":72,\"trainerLevel\":73,"
                                + "\"qualityTier\":\"rare\",\"quality\":\"rare\",\"exactMultiplier\":1.3,"
                                + "\"nature\":\"adamant\",\"gender\":\"male\",\"isShiny\":false,"
                                + "\"isStarter\":true,\"expBuff\":1.5,\"ivs\":{\"hp\":18,\"atk\":30,"
                                + "\"def\":1,\"spAtk\":29,\"spDef\":30,\"speed\":8}}";
                        }
                        var result = await executor.RunAsync(owner,
                            completeInput ? "pptools-smoke-rich" : "pptools-smoke-1",
                            attacker, CancellationToken.None);
                        if (!result.Contains("\"ppbui.pptools.hunt-recommendations\"") ||
                            Regex.Matches(result, "\"rank\":").Count != 3)
                            throw new InvalidOperationException("Simulation returned a result with an invalid shape.");
                        Console.WriteLine("PPTools background runner" +
                            (completeInput ? " (full attacker)" : "") +
                            ": PASS, results=3, bytes=" + result.Length);
                    }
                    catch (Exception error)
                    {
                        Console.Error.WriteLine("PPTools background runner: FAIL " + error.Message);
                        Environment.ExitCode = 1;
                    }
                    finally
                    {
                        timeout.Stop();
                        if (!owner.IsDisposed) owner.Close();
                    }
                };
                Application.Run(owner);
            }
        }

        // Pure host-boundary regression: no WebView2 environment, HTTP or game profile.
        public static void RunPrivacySmoke()
        {
            try
            {
                const string full = "{\"pokemon\":\"wartortle\",\"level\":72,\"trainerLevel\":73,"
                    + "\"qualityTier\":\"rare\",\"quality\":\"rare\",\"exactMultiplier\":1.3,"
                    + "\"nature\":\"adamant\",\"gender\":\"male\",\"isShiny\":false,\"isStarter\":true,"
                    + "\"expBuff\":1,\"buffs\":{\"lucky\":true,\"trainerPrivate\":\"trainerSecret\"},"
                    + "\"ivs\":{\"hp\":18,\"atk\":30,\"def\":1,\"spAtk\":29,\"spDef\":30,"
                    + "\"speed\":8,\"privateIv\":\"nestedSecret\"},\"privateToken\":\"topSecret\"}";
                var message = new WorkspaceBridgeMessage
                {
                    LeaderSpeciesId = "wartortle", LeaderLevel = 72, InputJson = full
                };
                string canonical;
                if (!WorkspaceForm.TryBuildCanonicalPptoolsInput(message, out canonical))
                    throw new InvalidOperationException("Valid native-shaped payload rejected.");
                if (canonical.Contains("privateToken") || canonical.Contains("topSecret") ||
                    canonical.Contains("privateIv") || canonical.Contains("nestedSecret") ||
                    canonical.Contains("\"buffs\"") || canonical.Contains("trainerPrivate") ||
                    canonical.Contains("trainerSecret") ||
                    !canonical.Contains("\"speed\":8") || !canonical.Contains("\"isShiny\":false"))
                    throw new InvalidOperationException("Canonical payload leaked extra data or altered valid types.");

                VerifyPrivacyReject(message, full.Replace("\"speed\":8", "\"speed\":32"),
                    "IV above 31");
                VerifyPrivacyReject(message, full.Replace("\"qualityTier\":\"rare\"", "\"removedTier\":\"rare\""),
                    "Missing required field");
                VerifyPrivacyReject(message, full.Replace("\"quality\":\"rare\"", "\"quality\":\"epic\""),
                    "Inconsistent quality");
                VerifyPrivacyReject(message, full.Replace("\"isShiny\":false", "\"isShiny\":\"false\""),
                    "Boolean encoded as string");
                VerifyPrivacyReject(message, full.Replace("\"level\":72", "\"level\":\"72\""),
                    "Level encoded as string");
                VerifyPrivacyReject(message, full.Replace("\"speed\":8", "\"speed\":\"8\""),
                    "IV encoded as string");
                VerifyPrivacyReject(message, full.Replace("\"trainerLevel\":73", "\"trainerLevel\":0"),
                    "Trainer level out of range");
                VerifyPrivacyReject(message, full.Replace("\"exactMultiplier\":1.3", "\"exactMultiplier\":11"),
                    "Exact multiplier out of range");
                VerifyPrivacyReject(message, full.Replace("\"expBuff\":1", "\"expBuff\":0"),
                    "Non-positive EXP multiplier");
                message.LeaderSpeciesId = "gengar";
                VerifyPrivacyReject(message, full, "Native leader identity mismatch");
                message.LeaderSpeciesId = "wartortle";
                message.LeaderLevel = 73;
                VerifyPrivacyReject(message, full, "Native leader level mismatch");

                Console.WriteLine("PPTools privacy smoke: PASS (canonical fields/types, stripped buffs and fail-closed boundaries).");
            }
            catch (Exception failure)
            {
                Console.Error.WriteLine("PPTools privacy smoke: FAIL " + failure.Message);
                Environment.ExitCode = 1;
            }
        }

        private static void VerifyPrivacyReject(WorkspaceBridgeMessage message, string input, string label)
        {
            message.InputJson = input;
            string result;
            if (WorkspaceForm.TryBuildCanonicalPptoolsInput(message, out result) || result != null)
                throw new InvalidOperationException(label + " was accepted.");
        }
    }
}
