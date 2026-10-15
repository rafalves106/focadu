namespace Focadu.Domain.ProductMetrics;

/// <summary>
/// Resume o User-Agent em computador, celular ou tablet (Fase 103, medicao de produto). Heuristica simples, sem
/// biblioteca: basta para saber quais telas sao abertas no celular. iPad com iPadOS 13+ se apresenta como Mac e
/// conta como computador - aceitavel para a leva de ~5 testadores.
/// </summary>
public static class DeviceClassifier
{
    public static DeviceClass FromUserAgent(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
            return DeviceClass.Desktop;

        var ua = userAgent.ToLowerInvariant();
        if (ua.Contains("ipad") || ua.Contains("tablet") || (ua.Contains("android") && !ua.Contains("mobile")))
            return DeviceClass.Tablet;
        if (ua.Contains("mobi") || ua.Contains("iphone") || ua.Contains("ipod") || ua.Contains("android"))
            return DeviceClass.Mobile;
        return DeviceClass.Desktop;
    }
}
