const fs = require("fs");
const path = require("path");
import Jimp from "jimp";
import canvasGif from "./index";

const callBack = (context: any, width: any, height: any, totalFrames: any, currentFrame: any) => {
    // // Edit the frame
    //   context.fillStyle = "#FFA500";
    //   context.font = '30px "Fira Code Retina"';
    //   context.fillText("Edited by Eze!", 40, 80);

};

async function main() {
    const image = await Jimp.read(path.join(__dirname, "..", "assets", "NuggetBackground.png"));

    let message = 'Hello!'
    let x = 10
    let y = 10

    Jimp.loadFont(Jimp.FONT_SANS_64_BLACK)
        .then((font: any) => {
            image.print(font, x, y, message)
            return image
        }).then((image: any) => {
            let file = `new_name.${image.getExtension()}`
            return image.write(file) // save
        })

    const imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

    canvasGif(path.join(__dirname, "..", "assets", "01_Tiny_var1.gif"), callBack, {
        coalesce: true, // whether the gif should be coalesced first, default: false
        // delay: 30, // the delay between each frame in ms, default: 0
        repeat: 0, // how many times the GIF should repeat, default: 0 (runs forever)
        algorithm: 'neuquant', // the algorithm the encoder should use, default: 'neuquant',
        // optimiser: true, // whether the encoder should use the in-built optimiser, default: false,
        // fps: 60, // the amount of frames to render per second, default: 60
        // quality: 1, // the quality of the gif, a value between 1 and 100, default: 100
        frames: new Array(25).fill(imageBuffer)
    })
        .then((buffer: Buffer) =>
            fs.writeFileSync(path.resolve(__dirname, "..", "output", "output1.gif"), buffer)
        )
        .catch((error: Error) => {
            console.log(error);
        });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
})
