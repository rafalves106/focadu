using Focadu.Application.Weeklies;
using Xunit;

namespace Focadu.Tests.Weeklies;

public class GitHubUrlParserTests
{
    [Theory]
    [InlineData("https://github.com/falves/projeto", "falves", "projeto")]
    [InlineData("https://github.com/falves/projeto/", "falves", "projeto")]
    [InlineData("HTTPS://GITHUB.COM/falves/projeto", "falves", "projeto")]
    public void TryParse_ValidRepoUrl_ExtractsOwnerAndRepo(string url, string owner, string repo)
    {
        var result = GitHubUrlParser.TryParse(url);

        Assert.Equal((owner, repo), result);
    }

    [Theory]
    [InlineData("https://github.com/falves")]
    [InlineData("https://linkedin.com/posts/falves_projeto")]
    [InlineData("https://github.com/falves/projeto/blob/main/README.md")]
    [InlineData("")]
    public void TryParse_InvalidOrNonRepoUrl_ReturnsNull(string url)
    {
        Assert.Null(GitHubUrlParser.TryParse(url));
    }
}
