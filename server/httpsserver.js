import express from "express";
import https from "https"; // Import HTTPS module
import http from "http";  // Optional: Keep HTTP for redirection
import fs from "fs";      // File system module for certificates
import axios from "axios";
import FormData from "form-data";
import { writeFile, stat } from "node:fs/promises"; 
import sharp from "sharp"; 
import dotenv from "dotenv";
import fileUpload from "express-fileupload"; 
import cors from "cors"; 
import path from "path"; 
import Replicate from "replicate";

dotenv.config();

const app = express();
const PORT = 3443;
const HTTPS_PORT = 3000; // New HTTPS port

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Load SSL/TLS Certificates
const sslOptions = {
    key: fs.readFileSync("server.key"),     // Private key
    cert: fs.readFileSync("server.cert"),  // Certificate
};

// Middleware
app.use(express.json());
app.use(cors());
app.use(fileUpload());
const __dirname = path.resolve();
app.use("/imagesGen", express.static(path.join(__dirname, "imagesGen")));
app.use((req, res, next) => {
    req.setTimeout(5 * 60 * 1000); // 5 minutes
    res.setTimeout(5 * 60 * 1000);
    next();
});


// HTTPS Server
https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`HTTPS server running on https://localhost:${HTTPS_PORT}`);
});

// Health Check Route
app.get("/", (req, res) => {
    res.send("Hello, HTTPS World!");
});


// Route to handle input requests
app.post('/evaluate', async (req, res) => {
    try {
        console.log(Date.now())
        const negative_prompt = process.env.negative_prompt;
        const { creative_details, scoring_criteria } = req.body;
        const { product_name, tagline, brand_palette, dimensions, cta_text, logo_url, product_image_url, target_audience } = creative_details;
        const isValidCriteria = scoring_criteria.every(
            criterion => typeof criterion.parameter === 'string' && typeof criterion.weight === 'number'
        );

        const prompt_generation = `Create a graphic creative prompt for this product with its name being ${product_name} and the target audience being ${target_audience}, the tagline of the brand is ${tagline} and the button for call to action is ${cta_text}. The brand follows the color pallette as ${brand_palette}. Out of hundered percent distribute the weight of generated image on ${scoring_criteria[0].parameter} around ${scoring_criteria[0].weight}%, ${scoring_criteria[1].parameter} around ${scoring_criteria[1].weight}%, ${scoring_criteria[2].parameter} around ${scoring_criteria[2].weight}%, ${scoring_criteria[3].parameter} around ${scoring_criteria[3].weight}%, ${scoring_criteria[4].parameter} around ${scoring_criteria[4].weight}% making it a total of 100% `

        const input = {
            top_k: 0,
            top_p: 0.9,
            prompt: `${prompt_generation}`,
            max_tokens: 1024,
            min_tokens: 0,
            temperature: 0.6,
            system_prompt: process.env.llama_system_prompt,
            length_penalty: 1,
            stop_sequences: "<|end_of_text|>,<|eot_id|>",
            prompt_template: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\nyou are a talented graphic deisgner. Analyze the provided product details without altering them. Generate dynamic image generation prompt under 200 words in a simple flowing paragraph style. include visual styles, color palettes, typography, and layout recommendations, tailored to the specified product category. Focus on enhancing visual appeal while preserving the given details. Include placement suggestions for taglines, CTAs, logos, and other elements to ensure a clean and professional composition. Optimize for modern design trends and aesthetic harmony suitable for the target audience. only give the prompt, don't give anything else, not even the intro text.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
            presence_penalty: 1.15,
            log_performance_metrics: false
        };



        console.log("======> ", prompt_generation);
        // console.log(finalPrompt);

        // Validate creative_details
        if (!creative_details || typeof creative_details !== 'object') {
            return res.status(400).json({ error: "Missing or invalid 'creative_details' object." });
        }
        if (!product_name || !tagline || !Array.isArray(brand_palette) || !dimensions || !cta_text || !logo_url || !product_image_url) {
            return res.status(400).json({ error: "Invalid 'creative_details' fields." });
        }
        if (typeof dimensions.width !== 'number' || typeof dimensions.height !== 'number') {
            return res.status(400).json({ error: "Invalid 'dimensions' fields. Width and height must be numbers." });
        }
        // Validate scoring_criteria
        if (!Array.isArray(scoring_criteria) || scoring_criteria.length === 0) {
            return res.status(400).json({ error: "Missing or invalid 'scoring_criteria'. It must be a non-empty array." });
        }
        if (!isValidCriteria) {
            return res.status(400).json({ error: "Invalid 'scoring_criteria'. Each criterion must have a 'parameter' (string) and 'weight' (number)." });
        }

        //refined prompt from llama 70b instruct
        const finalPrompt = await replicate.run("meta/meta-llama-3-70b-instruct", { input });
        console.log("======> ", finalPrompt.join(""));


        // running the flux on control net (soft_edge)

        const output = await replicate.run(
            process.env.flux_dev_controlnet,
            {
                input: {
                    steps: 28,
                    prompt: `${finalPrompt}`,
                    lora_url: "",
                    control_type: "soft_edge",
                    control_image: `${product_image_url}`,
                    lora_strength: 1,
                    output_format: "png",
                    guidance_scale: 2.5,
                    output_quality: 100,
                    negative_prompt: `${negative_prompt}`,
                    control_strength: 0.4,
                    depth_preprocessor: "DepthAnything",
                    soft_edge_preprocessor: "HED",
                    image_to_image_strength: 0.18,
                    return_preprocessed_image: false
                }
            }
        );

        // Specify the folder where you want to save the images
        const outputFolder = path.join(__dirname, "imagesGen");
        let filename 
        let filePath
        let imageURL
        let serverURL



        for (const [index, item] of Object.entries(output)) {
            filename = `output_${index}_${Date.now()}.png`
            filePath = path.join(outputFolder, `${filename}`); // Create the full file path
            imageURL = `http://localhost:3000/imagesGen/${filename}`
            serverURL = `ethixlucifer.eastus2.cloudapp.azure.com:3000/imagesGen/${filename}`
            console.log("======> ", `out of the file for server = ${imageURL}`)
            await writeFile(filePath, item); // Save the image to the imagesGen folder
            console.log("======> ", `Image saved at ${filePath}`); // Log the file path for verification
        }


        // Fetch metadata
        const stats = await stat(filePath);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        const metadata = await sharp(filePath).metadata();
        const imageDimensions = {
            width: metadata.width,
            height: metadata.height,
        };

        //Evaluating the Scores 

        // While generating this image i told my AI model to distribute the weight of generated image on ${scoring_criteria[0].parameter} around ${scoring_criteria[0].weight}%, ${scoring_criteria[1].parameter} around ${scoring_criteria[1].weight}%, ${scoring_criteria[2].parameter} around ${scoring_criteria[2].weight}%, ${scoring_criteria[3].parameter} around ${scoring_criteria[3].weight}%, ${scoring_criteria[4].parameter} around ${scoring_criteria[4].weight}% making it a total of 100%. Now analyze the given image and tell me out of 100% how much in percentage does the given parameters weigh in the image and sum of the observed weights. do keep note that i want actual observed values to test the accracy of my image generation model, so do a thorough critical analysis and strictly give response only in the format i've specified, not even intro and outro text, only the format that i've told you that is "${scoring_criteria[0].parameter} : observed %, ${scoring_criteria[1].parameter} : observed %, ${scoring_criteria[2].parameter} : observed %, ${scoring_criteria[3].parameter} : observed %, ${scoring_criteria[4].parameter} : observed %, totalScore : sum of all observed score %


        const singlePrompt = `While generating this image i specified weights to be focused on while generating the image on different parameters. making it a total of 100%. the overall summation of weights would be 100 so you have t analyze how much percentage of weights in parameters is distributed across. Now analyze the given image and tell me out of 100% how much in percentage does the given parameters weigh in the image and sum of the observed weights. do note that totalscore will be 100%, so analyze image's parameter weight distribution accordingly. i want observed values to test the accracy of my image generation model, so do a thorough critical analysis and strictly give response only in the format i've specified, not even intro and outro text, only the format that i've told you that is "${scoring_criteria[0].parameter} : observed %, ${scoring_criteria[1].parameter} : observed %, ${scoring_criteria[2].parameter} : observed %, ${scoring_criteria[3].parameter} : observed %, ${scoring_criteria[4].parameter} : observed %, totalScore : sum of all observed score %"`


        // const scoringPromt0 = `Give only what is asked not anything else. analyze the given image and tell write out of 100% how much in percentage does the parameter background_foreground_seperation is focused on in the image. do keep note that i want actual observed values to test the accracy of my image generation model, so do a thorough critical analysis and strictly give response only in the numerical format, words are not expected as output, only the format that i've told you that is observed_percentage_in_number.  Eg if parameter weight is twenty percent, then instead of writing "The parameter background\_foreground\_seperation in the given image is focused on 20% out of 100%." simply write 20. Again im emphasizing to start with number`

        // const scoringPromt1 = `While generating this image i told my AI model to distribute the weight of generated image on making it a total of 100%. Now analyze the given image and tell me out of 100% how much in percentage does the ${scoring_criteria[1].parameter} weigh in the image. do keep note that i want actual observed values to test the accracy of my image generation model, so do a thorough critical analysis and strictly give response only in the numerical format, no text word is expected as output, only the format that i've told you that is "observed_percentage_in_number". Again im emphasizing that i only want numerical percentage as the output without any bias`

        // const scoringPromt2 = `While generating this image i told my AI model to distribute the weight of generated image on making it a total of 100%. Now analyze the given image and tell me out of 100% how much in percentage does the ${scoring_criteria[2].parameter} weigh in the image. do keep note that i want actual observed values to test the accracy of my image generation model, so do a thorough critical analysis and strictly give response only in the numerical format, no text word is expected as output, only the format that i've told you that is "observed_percentage_in_number". Again im emphasizing that i only want numerical percentage as the output without any bias`

        // const scoringPromt3 = `While generating this image i told my AI model to distribute the weight of generated image on making it a total of 100%. Now analyze the given image and tell me out of 100% how much in percentage does the ${scoring_criteria[3].parameter} weigh in the image. do keep note that i want actual observed values to test the accracy of my image generation model, so do a thorough critical analysis and strictly give response only in the numerical format, no text word is expected as output, only the format that i've told you that is "observed_percentage_in_number". Again im emphasizing that i only want numerical percentage as the output without any bias`

        // const scoringPromt4 = `While generating this image i told my AI model to distribute the weight of generated image on making it a total of 100%. Now analyze the given image and tell me out of 100% how much in percentage does the ${scoring_criteria[4].parameter} weighs in the given image. do keep note that i want actual observed values to test the accracy of my image generation model, so do a thorough critical analysis and strictly give response only in the numerical format, no text word is expected as output, only the format that i've told you that is "observed_percentage_in_number". Again im emphasizing that i only want numerical percentage as the output without any bias`

        // const outputforScoring = await replicate.run(process.env.minigpt,
        //     {
        //         input: {
        //             // image: `${serverURL}`,
        //             image: "http://ethixlucifer.eastus2.cloudapp.azure.com:3000/imagesGen/output_0_1734962364802.png",
        //             top_p: 0.9,
        //             prompt: `${singlePrompt}`,
        //             num_beams: 5,
        //             max_length: 4000,
        //             temperature: 1.33,
        //             max_new_tokens: 100,
        //             repetition_penalty: 3
        //         }
        //     }
        // );

        // const outputforScoring0 = await replicate.run(process.env.minigpt,
        //     {
        //         input: {
        //             // image: `${serverURL}`,
        //             image: "https://replicate.delivery/yhqm/KTmXVxvup2aeEyQp31R3pjvTm1scQBIfWYeF7xVzmfBNecrfE/R8_FLUX_XLABS_00001_.webp",
        //             top_p: 0.9,
        //             prompt: `${scoringPromt0}`,
        //             num_beams: 5,
        //             max_length: 4000,
        //             temperature: 0.11,
        //             max_new_tokens: 2,
        //             repetition_penalty: 3
        //         }
        //     }
        // );

        // const outputforScoring1 = await replicate.run(process.env.minigpt,
        //     {
        //         input: {
        //             // image: `${serverURL}`,
        //             image: "https://replicate.delivery/pbxt/IqG1MbemhULihtfr62URRZbI29XtcPsnOYASrTDQ6u5oSqv9/llama_13b.png",
        //             top_p: 0.9,
        //             prompt: `${scoringPromt1}`,
        //             num_beams: 5,
        //             max_length: 4000,
        //             temperature: 1.32,
        //             max_new_tokens: 2,
        //             repetition_penalty: 3
        //         }
        //     }
        // ); const outputforScoring2 = await replicate.run(process.env.minigpt,
        //     {
        //         input: {
        //             // image: `${serverURL}`,
        //             image: "https://replicate.delivery/pbxt/IqG1MbemhULihtfr62URRZbI29XtcPsnOYASrTDQ6u5oSqv9/llama_13b.png",
        //             top_p: 0.9,
        //             prompt: `${scoringPromt2}`,
        //             num_beams: 5,
        //             max_length: 4000,
        //             temperature: 1.32,
        //             max_new_tokens: 2,
        //             repetition_penalty: 3
        //         }
        //     }
        // ); const outputforScoring3 = await replicate.run(process.env.minigpt,
        //     {
        //         input: {
        //             // image: `${serverURL}`,
        //             image: "https://replicate.delivery/pbxt/IqG1MbemhULihtfr62URRZbI29XtcPsnOYASrTDQ6u5oSqv9/llama_13b.png",
        //             top_p: 0.9,
        //             prompt: `${scoringPromt3}`,
        //             num_beams: 5,
        //             max_length: 4000,
        //             temperature: 1.32,
        //             max_new_tokens: 2,
        //             repetition_penalty: 3
        //         }
        //     }
        // ); const outputforScoring4 = await replicate.run(process.env.minigpt,
        //     {
        //         input: {
        //             // image: `${serverURL}`,
        //             image: "https://replicate.delivery/pbxt/IqG1MbemhULihtfr62URRZbI29XtcPsnOYASrTDQ6u5oSqv9/llama_13b.png",
        //             top_p: 0.9,
        //             prompt: `${scoringPromt4}`,
        //             num_beams: 5,
        //             max_length: 4000,
        //             temperature: 1.32,
        //             max_new_tokens: 2,
        //             repetition_penalty: 3
        //         }
        //     }
        // );

        console.log("======> ", `${outputforScoring}  Minigpt output`) //${outputforScoring1} ${outputforScoring2} ${outputforScoring3} ${outputforScoring4}

        // Process and respond with success
        // Example JSON response
        const response = {
            status: "success",
            creative_url: `${serverURL}`,
            scoring: {
                // background_foreground_separation: 15,
                // brand_guideline_adherence: 19,
                // creativity_visual_appeal: 16,
                // product_focus: 15,
                // call_to_action: 14,
                // audience_relevance: 9,
                // total_score: 91,
                completeScore: `${outputforScoring}`
            },
            metadata: {
                file_size_kb: fileSizeKB,
                dimensions: imageDimensions,
            },
        };

        console.log("Ending one request in time ", Date.now())

        return res.status(200).json(response);
    } catch (error) {
        console.error("Error faced during operation", error);
        return res.status(500).json({ error: "Failed to RUN", details: error.message });
    }
});




// // Start the server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

