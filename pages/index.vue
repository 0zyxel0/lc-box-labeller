<template>
	<div>
		<NuxtLayout>
			<v-app>
				<v-app-bar color="primary">
					<v-app-bar-title>Box Lister</v-app-bar-title>
				</v-app-bar>
				<v-main>
					<v-container>
						<!-- Tabs -->
						<v-tabs v-model="activeTab" grow>
							<v-tab value="0">Create New List</v-tab>
							<v-tab value="1">Scan QR Code</v-tab>
						</v-tabs>

						<v-tabs-window v-model="activeTab">
							<!-- Tab 1: Create New List -->
							<v-tabs-window-item :value="0">
								<v-form @submit.prevent="submitForm" class="mt-3">
									<v-text-field label="Title" v-model="newItem.title" required></v-text-field>
									<v-select :items="boxTypes" label="Box Type" v-model="newItem.boxType" required></v-select>
									<v-card title="Contents">
										<v-card-text>
											<!-- Toolbar -->
											<div class="toolbar">
												<v-btn @click="toggleBold"><v-icon>mdi-format-bold</v-icon></v-btn>
												<v-btn @click="toggleItalic"><v-icon>mdi-format-italic</v-icon></v-btn>
												<v-btn @click="toggleBulletList"><v-icon>mdi-format-list-bulleted</v-icon></v-btn>
											</div>
											<EditorContent :editor="editor" v-model="newItem.contents" class="custom-editor" />
										</v-card-text>
									</v-card>
									<v-card flat>
										<v-card-text>
											<v-textarea label="Comments" v-model="newItem.comments"></v-textarea>
										</v-card-text>
									</v-card>
									<!-- File Picker -->
									<v-file-input label="Upload Image" @change="handleFileChange" accept="image/*"></v-file-input>
									<!-- Display Uploaded Image -->
									<div v-if="imagePreview" class="mt-3">
										<img :src="imagePreview" alt="Uploaded Image" style="max-width: 100%; height: auto" />
									</div>
									<!-- Submit button with loader -->
									<div class="mt-3">
										<v-btn type="submit" :disabled="loading" color="primary" block size="x-large">
											Submit
											<v-progress-circular v-if="loading" indeterminate color="white" size="20" class="ml-2"></v-progress-circular>
										</v-btn>
									</div>
								</v-form>
							</v-tabs-window-item>
							<!-- Tab 2: QR Code Scanner -->
							<v-tabs-window-item :value="1">
								<v-card flat>
									<v-card-text>
										<video ref="videoElem" style="width: 100%"></video>
										<div v-if="scanResult" class="mt-4">
											<h3>Decoded QR Code:</h3>
											<p>{{ scanResult }}</p>
										</div>
									</v-card-text>
								</v-card>
								<v-btn v-if="scanStarted == false" @click="startScan" size="x-large" color="primary" class="mt-4" block>Start Scanning</v-btn>
								<v-btn v-else @click="stopScan" size="x-large" block color="error">Stop Scanning</v-btn>
								<v-card v-if="nocodbData" class="mt-3">
									<v-card-title>QR Code Data</v-card-title>
									<v-card-text>
										<p><strong>Title:</strong> {{ nocodbData.title }}</p>
										<p><strong>Contents:</strong> {{ nocodbData.contents }}</p>
										<p><strong>Comments:</strong> {{ nocodbData.comments }}</p>
										<p><strong>Box Type:</strong> {{ nocodbData.boxType }}</p>
									</v-card-text>
								</v-card>

								<v-alert v-if="qrResult" type="success" class="mt-3">QR Code found: {{ qrResult }}</v-alert>
								<v-alert v-if="qrError" type="error" class="mt-3">{{ qrError }}</v-alert>
							</v-tabs-window-item>
						</v-tabs-window>
					</v-container>
				</v-main>
			</v-app>
		</NuxtLayout>
	</div>
</template>

<script setup>
const config = useRuntimeConfig();
import { ref } from "vue";
import QrScanner from "qr-scanner";
import { v4 as uuidv4 } from "uuid";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import axios from "axios";
const NOCODB_BASEURL = config.public.NOCODB_BASEURL;
const NOCODB_APIKEY = config.public.NOCODB_APIKEY;
const scanStarted = ref(false);
const activeTab = ref(0);
const qrResult = ref(null);
const qrError = ref(null);
const nocodbData = ref(null);
const newItem = ref({
	title: "",
	contents: "",
	comments: "",
	boxType: null,
	publicid: null,
});
const boxTypes = ["Kitchen", "Living Room", "Shoes", "Keller", "Others", "Computer Parts", "Food", "Clothes", "Dining", "Carina Room", "Calvin Room"];
const videoElem = ref(null);
const scanResult = ref("");
let qrScanner = null; // Declare the QR scanner instance here
const loading = ref(false); // For showing the loader
const imagePreview = ref(null); // To hold the image preview URL
const imageFile = ref(null); // To hold the image file

// editor's content
const content = ref(`<p>Edit Contents of Box Here</p>`);
const editor = useEditor({
	content: content.value,
	extensions: [StarterKit.configure({ history: false })],
});

// Toolbar Commands
const toggleBold = () => {
	if (editor.value) {
		editor.value.chain().focus().toggleBold().run();
	}
};

const toggleItalic = () => {
	if (editor.value) {
		editor.value.chain().focus().toggleItalic().run();
	}
};

const toggleBulletList = () => {
	if (editor.value) {
		editor.value.chain().focus().toggleBulletList().run();
	}
};

async function startScan() {
	scanStarted.value = true;
	if (!videoElem.value) return;

	qrScanner = new QrScanner(
		videoElem.value,
		(result) => {
			console.log("decoded qr code:", result);
			scanResult.value = result; // Store the result to display it
			qrScanner.stop(); // Stop scanning after a successful read
		},
		{
			highlightScanRegion: true,
			highlightCodeOutline: true,
			returnDetailedScanResult: true,
		}
	);

	qrScanner.start(); // Start scanning
}

async function stopScan() {
	if (qrScanner) {
		qrScanner.stop(); // Stop scanning
		scanStarted.value = false;
	}
}

const handleFileChange = (event) => {
	const file = event.target.files[0];
	if (file) {
		imagePreview.value = URL.createObjectURL(file); // Create a local URL for the uploaded image
		imageFile.value = file; // Store the image file for uploading
	}
};

// Function to upload image to NocoDB storage
async function uploadImage(file) {
	const formData = new FormData();
	formData.append("file", file);

	const response = await axios.post(`${NOCODB_BASEURL}/storage/upload`, formData, {
		headers: {
			"Content-Type": "multipart/form-data",
			"xc-token": NOCODB_APIKEY,
		},
	});
	return response.data; // Assuming the response contains the uploaded image info
}

// Function to handle form submission and save to database
const submitForm = async () => {
	loading.value = true; // Set loading to true
	const editorContent = editor.value.getHTML(); // Get the HTML content from the editor
	const genId = uuidv4();
	try {
		let imageResult = null;
		if (imageFile.value) {
			imageResult = await uploadImage(imageFile.value); // Upload image if present
		}
		const payload = {
			Title: newItem.value.title,
			Contents: editorContent, // Save the editor content as HTML
			Comments: newItem.value.comments,
			"Box Type": newItem.value.boxType,
			Assets: imageResult ? imageResult : null, // Include uploaded image info if available
			publicurl: `${useRequestURL().hostname}/viewer/?qid=${genId}`,
			publicid: genId,
		};
		const response = await fetch(`${NOCODB_BASEURL}/tables/mndechcrzo8xna3/records`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"xc-token": NOCODB_APIKEY,
			},
			body: JSON.stringify(payload),
		});

		const data = await response.json();
		alert("New list created successfully");

		newItem.value = { title: "", contents: "", comments: "", boxType: null, publicid: null, publicurl: null}; // Clear the form fields
		imagePreview.value = null; // Clear the image preview
		imageFile.value = null; // Clear the image file
	} catch (error) {
		console.error("Error creating list:", error);
		alert("Error submitting form");
	} finally {
		loading.value = false; // Set loading to false after submission
	}
};
</script>

<style>
.toolbar {
	margin-bottom: 10px;
}

.custom-editor {
	color: #007bff; /* Blue text */
	background-color: #f5f5f5; /* Light grey background */
	font-size: 16px;
	padding: 20px;
	border: 1px solid #d1d1d1;
	min-height: 150px;
}
</style>
