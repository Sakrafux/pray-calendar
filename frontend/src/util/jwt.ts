export function parseJwt(token: string) {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) {
        throw new Error("Invalid JWT");
    }

    const decode = (str: string) => JSON.parse(atob(str.replace(/-/g, "+").replace(/_/g, "/")));

    const header = decode(headerB64);
    const payload = decode(payloadB64);
    const signature = signatureB64; // usually you leave it as-is

    return { header, payload, signature };
}
