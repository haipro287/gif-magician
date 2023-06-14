import gm from 'gm';
import decodeGif from 'decode-gif';
import fs from 'fs';
import { createCanvas, createImageData, Image, registerFont } from 'canvas';
const GIFEncoder = require('gif-encoder-2');

/**
 * Coalesces a GIF using GraphicsMagick
 * @param input The GIF to coalesce
 * @returns A buffer of the coalesced GIF
 */
function coalesce(input: string | Buffer) {
    let coalesced: Buffer | undefined = undefined;
    let error: Error | undefined = undefined;

    // Coalesce the input GIF
    gm(input)
        .coalesce()
        .toBuffer(async (err, buffer) => {
            if (err) error = err;
            coalesced = buffer ? buffer : undefined;
        });

    const waitForCoalesced = (resolve: Function, reject: Function) => {
        if (coalesced && coalesced.length > 0) resolve(coalesced);
        else if (coalesced === undefined && error)
            reject(
                new Error(
                    `There was an error during coalescing: ${(error as Error).message}. Reverting to file buffer!`
                )
            );
        else setTimeout(() => { waitForCoalesced(resolve, reject) }, 30);
    }

    // Promise a coalesced Buffer
    return new Promise<Buffer>(waitForCoalesced);
}

type EditFrame = (
    // ctx: CanvasRenderingContext2D,
    ctx: any,
    width: number,
    height: number,
    totalFrames: number,
    currentFrame: number,
    // encoder: GIFEncoder
    encoder: any
) => void;

type Algorithm = 'neuquant' | 'octree';

interface Options {
    coalesce?: boolean;
    delay?: number;
    repeat?: number;
    algorithm?: Algorithm;
    optimiser?: boolean;
    fps?: number;
    quality?: number;
    frames?: Buffer[];
}

/**
 * Renders a new GIF after manipulating every frame using node-canvas
 * @param input The file path to or a buffer of the original GIF
 * @param editFrame The function to run for every frame
 * @param options
 * @returns
 */
export = async function canvasGif(
    input: string | Buffer,
    editFrame: EditFrame,
    options: Options
) {
    let bufferToEdit: Buffer | undefined = undefined;

    // Parse options
    const coalesceEnabled = options?.coalesce ?? false;
    let algorithm: Algorithm =
        (options?.algorithm?.toLowerCase() as Algorithm) ?? 'neuquant';
    const optimiserEnabled = options?.optimiser ?? false;
    const delay = options?.delay ?? 0;
    const repeat = options?.repeat ?? 0;
    const fps = options?.fps ?? 60;
    const quality = options?.quality ?? 1;
    const addedFrames = options.frames ?? [];

    // Get the buffer from the input
    if (coalesceEnabled) {
        await coalesce(input)
            .then((res) => {
                bufferToEdit = res;
            })
            .catch((err) => {
                console.log(err);
                bufferToEdit =
                    typeof input === 'string' ? fs.readFileSync(input) : input;
            });
    } else {
        bufferToEdit =
            typeof input === 'string' ? fs.readFileSync(input) : input;
    }

    // Validate the algorithm
    if (!['neuquant', 'octree'].includes(algorithm)) {
        console.error(
            new Error(
                `${algorithm} is not a valid algorithm! Using neuquant as a substitute.`
            )
        );
        algorithm = 'neuquant';
    }

    // Decode the gif and begin the encoder
    const { width, height, frames } = decodeGif(bufferToEdit as Buffer);
    const encoder = new GIFEncoder(
        width,
        height,
        algorithm,
        optimiserEnabled,
        frames.length + addedFrames.length
    );

    encoder.on('readable', () => encoder.read());
    encoder.setDelay(delay);
    encoder.setRepeat(repeat);
    encoder.setFrameRate(fps);
    encoder.setQuality(quality);
    encoder.start();

    // Render each frame and add it to the encoder
    frames.forEach((frame, i) => {
        // Create the frame's canvas
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Create image data from the frame's data and put it on the canvas
        const data = createImageData(frame.data, width, height);
        ctx.putImageData(data, 0, 0);

        // Run the user's custom edit function, and add the frame
        editFrame(ctx, width, height, frames.length, i + 1, encoder);
        encoder.addFrame(ctx);
    });


    registerFont('assets/fonts/Oswald-VariableFont_wght.ttf', { family: 'Oswald' });
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const img = new Image; // Create a new Image
    img.src = addedFrames[0];
    ctx.drawImage(img, 0, 0);

    ctx.textAlign = 'center';
    const fontSize = 90;
    ctx.font = `bold ${fontSize}px Oswald`;
    const imgText = '500g'
    const textWidth = ctx.measureText(imgText).width;
    const gradient = ctx.createLinearGradient(width / 2, height / 2 - fontSize / 2, width / 2, (height + fontSize) / 2);
    gradient.addColorStop(0, "#d7a726");
    gradient.addColorStop(0.2, "#542c0b");
    gradient.addColorStop(0.7, "#f4d16b");
    gradient.addColorStop(1, "#facc3e");
    ctx.fillStyle = gradient;

    // const gradientStroke = ctx.createLinearGradient(width / 2, height / 2 - fontSize / 4, width / 2, (height + fontSize / 2) / 2);
    // gradient.addColorStop(0, "#000000");
    // gradient.addColorStop(0.9, "#eeeeee");
    // gradient.addColorStop(1, "#ffffff");

    ctx.strokeStyle = "white";

    ctx.fillText(imgText, width / 2, (height + fontSize / 2) / 2);
    ctx.strokeText(imgText, width / 2, (height + fontSize / 2) / 2);

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync("./image.png", buffer);

    addedFrames.forEach((frame, i) => {
        encoder.addFrame(ctx);
    })

    // Finish encoding and return the result
    encoder.finish();
    return encoder.out.getData() as Buffer;
};
