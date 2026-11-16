using Focadu.Application.Rooms;
using Focadu.Tests.Seed;
using Xunit;

namespace Focadu.Tests.Rooms;

/// <summary>
/// Rede de segurança da curadoria das salas: todo secret/conteudo/&lt;curso&gt;/salas/&lt;slug&gt;/sala.json passa pelo
/// <see cref="RoomImporter"/> de verdade (com a pasta ambiente/), sem banco. É a validação S4 da skill curar-sala.
/// Fora do checkout com o secret (CI) a lista fica só com um marcador, como no <see cref="CuratedContentAllFilesTests"/>.
/// </summary>
public class RoomContentAllFilesTests
{
    private static readonly string[] CourseSlugs = ["web-security", "linux", "python-websec"];

    public static IEnumerable<object[]> AllRoomFiles()
    {
        var files = CourseSlugs
            .Select(slug => (slug, dir: RoomContentPaths.RoomsDirectory(slug)))
            .Where(c => TestContent.Available && c.dir is not null && Directory.Exists(c.dir))
            .SelectMany(c => Directory.GetDirectories(c.dir!).Select(d => (c.slug, folder: d)))
            .Where(r => File.Exists(Path.Combine(r.folder, "sala.json")))
            .OrderBy(r => r.folder, StringComparer.Ordinal)
            .Select(r => new object[] { r.slug, r.folder })
            .ToList();
        return files.Count == 0 ? [["", ""]] : files;
    }

    [Theory]
    [MemberData(nameof(AllRoomFiles))]
    public void EveryRoomFile_PassesTheImporter(string courseFolder, string roomFolder)
    {
        if (roomFolder.Length == 0) return; // conteudo fora do checkout (CI)

        var json = File.ReadAllText(Path.Combine(roomFolder, "sala.json"));
        var (room, errors) = RoomImporter.TryParse(json, Path.GetFileName(roomFolder), courseFolder, roomFolder);

        Assert.True(room is not null, $"{Path.GetFileName(roomFolder)}: {string.Join("; ", errors)}");
    }
}
