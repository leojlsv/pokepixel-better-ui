# Verifies actual Windows filesystem failures using only disposable settings.
# Does not load the host, the game, browser profiles or real workspace settings.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $csc -PathType Leaf)) {
    throw 'The Windows .NET Framework x64 C# compiler is required.'
}

$tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$fixture = Join-Path $tempParent ('ppbui-settings-physical-io-' + [guid]::NewGuid().ToString('N'))
$source = Join-Path $fixture 'PhysicalIoCheck.cs'
$output = Join-Path $fixture 'PhysicalIoCheck.exe'

try {
    New-Item -ItemType Directory -Path $fixture -ErrorAction Stop | Out-Null
    $harness = @'
using System;
using System.IO;
using System.Threading;
using PokePixel.CoupledWorkspace;

internal static class PhysicalIoCheck
{
    private static void Require(bool condition, string reason)
    {
        if (!condition) throw new InvalidOperationException(reason);
    }

    private static void ExpectFilesystemError(Action operation, string stage)
    {
        try { operation(); }
        catch (IOException) { return; }
        catch (UnauthorizedAccessException) { return; }
        throw new InvalidOperationException(stage + " unexpectedly succeeded.");
    }

    private static void RequireSameBytes(byte[] expected, string path, string stage)
    {
        var current = File.ReadAllBytes(path);
        Require(expected.Length == current.Length, stage + ": file length changed.");
        for (var index = 0; index < expected.Length; index++)
            Require(expected[index] == current[index], stage + ": persisted bytes changed.");
    }

    public static int Main(string[] args)
    {
        if (args.Length != 1) return 2;
        var path = Path.Combine(args[0], "workspace.json");
        var temp = path + ".tmp";
        var store = new WorkspaceSettingsStore(path);
        var oldState = WorkspaceState.CreateBaseline();
        oldState.LayoutRatio = 0.44;
        var newState = WorkspaceState.CreateBaseline();
        newState.LayoutRatio = 0.66;
        newState.LastDualRatio = 0.66;
        store.Save(oldState);
        var baseline = File.ReadAllBytes(path);
        var previousFingerprint = store.NormalizedFingerprint(store.LoadOrDefault());
        Require(baseline.Length > 0 && !File.Exists(temp), "Initial Save left temporary data.");

        bool canSave;
        using (var held = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.None))
        {
            store.LoadOrDefault(out canSave);
            Require(!canSave, "Locked existing settings were classified as safe to overwrite.");
        }
        RequireSameBytes(baseline, path, "Locked startup read");
        ExpectFilesystemError(() => store.Save(newState), "Write after unreadable startup load");
        RequireSameBytes(baseline, path, "Write after unreadable startup load");
        var restored = store.LoadOrDefault(out canSave);
        Require(canSave && Math.Abs(restored.LayoutRatio - 0.44) < 0.0001,
            "A successful retry did not restore the existing preferences.");

        // A directory at the temporary file's path makes the real File.Create
        // call fail. This exercises Windows I/O, not the store's injection hook.
        Directory.CreateDirectory(temp);
        try
        {
            ExpectFilesystemError(() => store.Save(newState), "File.Create");
            RequireSameBytes(baseline, path, "File.Create");
            Require(previousFingerprint == store.NormalizedFingerprint(store.LoadOrDefault()),
                "File.Create changed the readable settings fingerprint.");
        }
        finally { Directory.Delete(temp); }

        // FileShare.None on the existing destination prevents File.Replace.
        // The closed temporary file must be removed by the store's finally.
        using (var held = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.None))
            ExpectFilesystemError(() => store.Save(newState), "File.Replace");
        RequireSameBytes(baseline, path, "File.Replace");
        Require(!File.Exists(temp), "File.Replace left the temporary settings file.");
        Require(previousFingerprint == store.NormalizedFingerprint(store.LoadOrDefault()),
            "File.Replace changed the readable settings fingerprint.");

        store.Save(newState);
        var reloaded = store.LoadOrDefault();
        Require(Math.Abs(reloaded.LayoutRatio - 0.66) < 0.0001,
            "Successful recovery did not save the new layout.");
        Require(!File.Exists(temp), "Successful recovery left temporary settings.");

        foreach (var unusable in new[] { "{ this is not valid JSON", "{\"version\":99}" })
        {
            var otherPath = Path.Combine(args[0], "unusable.json");
            File.WriteAllText(otherPath, unusable);
            var unusableBytes = File.ReadAllBytes(otherPath);
            new WorkspaceSettingsStore(otherPath).LoadOrDefault(out canSave);
            Require(!canSave, "Malformed or future-version settings were classified as safe to overwrite.");
            RequireSameBytes(unusableBytes, otherPath, "Unreadable existing settings");
        }
        var missing = new WorkspaceSettingsStore(Path.Combine(args[0], "missing.json"));
        missing.LoadOrDefault(out canSave);
        Require(canSave, "An absent settings document must permit first Save.");
        var secondCreator = new WorkspaceSettingsStore(Path.Combine(args[0], "missing.json"));
        secondCreator.Save(newState);
        var justCreated = File.ReadAllBytes(Path.Combine(args[0], "missing.json"));
        ExpectFilesystemError(() => missing.Save(oldState), "Missing-then-created collision");
        RequireSameBytes(justCreated, Path.Combine(args[0], "missing.json"), "Missing-then-created collision");

        var sharedPath = Path.Combine(args[0], "multi.json");
        var seed = new WorkspaceSettingsStore(sharedPath);
        seed.Save(oldState);
        var first = new WorkspaceSettingsStore(sharedPath);
        var second = new WorkspaceSettingsStore(sharedPath);
        first.LoadOrDefault(out canSave);
        Require(canSave, "The first existing-instance load was unexpectedly unsafe.");
        second.LoadOrDefault(out canSave);
        Require(canSave, "The second existing-instance load was unexpectedly unsafe.");
        second.Save(newState);
        var newer = File.ReadAllBytes(sharedPath);
        ExpectFilesystemError(() => first.Save(oldState), "Stale second process");
        RequireSameBytes(newer, sharedPath, "Stale second process");
        Require(!File.Exists(sharedPath + ".tmp"), "Stale second process left temporary settings.");

        // Two threads intentionally cross the same starting snapshot. Exactly
        // one commit can win; the other must report a protected conflict.
        var parallelPath = Path.Combine(args[0], "parallel.json");
        new WorkspaceSettingsStore(parallelPath).Save(oldState);
        var writerA = new WorkspaceSettingsStore(parallelPath);
        var writerB = new WorkspaceSettingsStore(parallelPath);
        writerA.LoadOrDefault(out canSave);
        Require(canSave, "Parallel writer A could not load its baseline.");
        writerB.LoadOrDefault(out canSave);
        Require(canSave, "Parallel writer B could not load its baseline.");
        var alternate = WorkspaceState.CreateBaseline();
        alternate.LayoutRatio = 0.71;
        var barrier = new ManualResetEvent(false);
        Exception errorA = null, errorB = null;
        var threadA = new Thread(() => { barrier.WaitOne(); try { writerA.Save(newState); }
            catch (Exception error) { errorA = error; } });
        var threadB = new Thread(() => { barrier.WaitOne(); try { writerB.Save(alternate); }
            catch (Exception error) { errorB = error; } });
        threadA.IsBackground = true;
        threadB.IsBackground = true;
        threadA.Start();
        threadB.Start();
        barrier.Set();
        Require(threadA.Join(4000) && threadB.Join(4000), "Parallel writers did not terminate in time.");
        Require((errorA == null && errorB is WorkspaceSettingsConflictException)
            || (errorB == null && errorA is WorkspaceSettingsConflictException),
            "Parallel writers did not produce exactly one success and one protected conflict.");
        Require(!File.Exists(parallelPath + ".tmp"), "Parallel writers left a temporary file.");
        var parallelLoaded = new WorkspaceSettingsStore(parallelPath).LoadOrDefault(out canSave);
        Require(canSave && (Math.Abs(parallelLoaded.LayoutRatio - 0.66) < 0.0001
            || Math.Abs(parallelLoaded.LayoutRatio - 0.71) < 0.0001),
            "Parallel writers damaged the winning persisted state.");

        // After an actual Create failure, a DIFFERENT thread must be able to
        // acquire the mutex; recursive acquisition on the same thread is weak.
        var unlockPath = Path.Combine(args[0], "unlock.json");
        var broken = new WorkspaceSettingsStore(unlockPath);
        broken.Save(oldState);
        broken.LoadOrDefault(out canSave);
        Directory.CreateDirectory(unlockPath + ".tmp");
        try { ExpectFilesystemError(() => broken.Save(newState), "Mutex release after real Create failure"); }
        finally { Directory.Delete(unlockPath + ".tmp"); }
        var waiter = new WorkspaceSettingsStore(unlockPath);
        waiter.LoadOrDefault(out canSave);
        Exception waiterError = null;
        var waiterThread = new Thread(() => { try { waiter.Save(newState); }
            catch (Exception error) { waiterError = error; } });
        waiterThread.IsBackground = true;
        waiterThread.Start();
        Require(waiterThread.Join(4000) && waiterError == null,
            "The mutex was not released after the physical Create failure.");
        Require(new WorkspaceSettingsStore(unlockPath).LoadOrDefault().LayoutRatio > 0.65,
            "The second thread could not persist after the failed Save.");

        Console.WriteLine("PHYSICAL SETTINGS IO PASS: locked/corrupt reads protected, Create/Replace failures preserve bytes, startup write guard, two-thread writer conflict, mutex release, recovery.");
        return 0;
    }
}
'@
    [IO.File]::WriteAllText($source, $harness, (New-Object System.Text.UTF8Encoding($false)))
    $sources = @(
        (Join-Path $toolDir 'WorkspaceModels.cs'),
        (Join-Path $toolDir 'WorkspaceSettingsStore.cs'),
        $source
    )
    $compileArgs = @(
        '/nologo', '/target:exe', '/platform:x64',
        '/reference:System.dll', '/reference:System.Core.dll',
        '/reference:System.Runtime.Serialization.dll', ('/out:' + $output)
    ) + $sources
    & $csc @compileArgs
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output -PathType Leaf)) {
        throw 'Could not compile the isolated settings I/O harness.'
    }
    & $output $fixture
    if ($LASTEXITCODE -ne 0) { throw "Isolated physical settings test failed (exit $LASTEXITCODE)." }
}
finally {
    $prefix = $tempParent + '\'
    if (-not $fixture.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or
        -not ([IO.Path]::GetFileName($fixture)).StartsWith('ppbui-settings-physical-io-',
            [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe isolated test cleanup target: $fixture"
    }
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
