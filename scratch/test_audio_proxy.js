// Scratch script to test ogg-opus-decoder
async function test() {
  try {
    console.log("Attempting dynamic import of ogg-opus-decoder...");
    const { OggOpusDecoder } = await import('ogg-opus-decoder');
    console.log("Successfully imported OggOpusDecoder!");
    const decoder = new OggOpusDecoder();
    await decoder.ready;
    console.log("Decoder is ready!");
  } catch (err) {
    console.error("Error during import/test:", err);
  }
}

test();
