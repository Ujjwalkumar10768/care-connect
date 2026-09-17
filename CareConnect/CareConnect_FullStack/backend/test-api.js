import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
const url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;

fetch(url)
.then(res => res.json())
.then(data => {
    if (data.models) {
        console.log("Available models:");
        data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
    } else {
        console.log(data);
    }
})
.catch(console.error);
