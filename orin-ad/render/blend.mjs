/*
 * Temporal-supersampling motion blur: blend K screenshot buffers taken across a
 * shutter window into one frame, approximating a real camera's open-shutter exposure.
 *
 * Averaging is done in an approximate linear-light space (gamma ~2.0 via square/sqrt,
 * cheap and visually indistinguishable from a true 2.2 gamma for this purpose) so
 * bright streaks don't go muddy the way a naive sRGB average would.
 */
import sharp from 'sharp';

// Pascal's-triangle weights: smoother falloff than a box average, so a moving edge
// blurs into a soft trail instead of K distinct ghost copies.
export function binomialWeights(k) {
  let row = [1];
  for (let i = 1; i < k; i++) {
    const next = [1];
    for (let j = 1; j < row.length; j++) next.push(row[j - 1] + row[j]);
    next.push(1);
    row = next;
  }
  const sum = row.reduce((a, b) => a + b, 0);
  return row.map((v) => v / sum);
}

// Sample instants across the shutter's open window, centred on the frame time.
export function shutterSamples(tCenter, fps, shutterAngle, k) {
  if (k <= 1) return [tCenter];
  const exposure = (shutterAngle / 360) * (1 / fps);
  const out = [];
  for (let i = 0; i < k; i++) out.push(tCenter + (i / (k - 1) - 0.5) * exposure);
  return out;
}

export async function decodeRaw(pngBuffer) {
  const { data, info } = await sharp(pngBuffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

export function blend(samples, weights) {
  const { width, height, channels } = samples[0];
  const n = width * height;
  const acc = new Float32Array(n * 3);
  for (let s = 0; s < samples.length; s++) {
    const { data, channels: ch } = samples[s];
    const w = weights[s];
    for (let p = 0, bo = 0, ao = 0; p < n; p++, bo += ch, ao += 3) {
      const r = data[bo] / 255, g = data[bo + 1] / 255, b = data[bo + 2] / 255;
      acc[ao] += r * r * w;
      acc[ao + 1] += g * g * w;
      acc[ao + 2] += b * b * w;
    }
  }
  const out = Buffer.allocUnsafe(n * 3);
  for (let p = 0, o = 0; p < n; p++, o += 3) {
    out[o] = (Math.sqrt(acc[o]) * 255 + 0.5) | 0;
    out[o + 1] = (Math.sqrt(acc[o + 1]) * 255 + 0.5) | 0;
    out[o + 2] = (Math.sqrt(acc[o + 2]) * 255 + 0.5) | 0;
  }
  return sharp(out, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 6 });
}

export async function captureBlended(page, cdp, times, weights) {
  const samples = [];
  for (const t of times) {
    await page.evaluate((tt) => window.ORIN.seek(tt), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false });
    samples.push(await decodeRaw(Buffer.from(data, 'base64')));
  }
  return blend(samples, weights);
}
