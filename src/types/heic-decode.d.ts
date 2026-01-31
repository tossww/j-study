declare module 'heic-decode' {
  interface HeicImage {
    width: number
    height: number
    data: Uint8Array
  }

  function heicDecode(options: { buffer: ArrayBuffer | Buffer }): Promise<HeicImage>
  export default heicDecode
}
