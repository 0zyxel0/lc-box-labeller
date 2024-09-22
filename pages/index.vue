<template>
	<div>
		<NuxtLayout>
			<v-app>
				<v-app-bar color="primary">
					<v-app-bar-title>Box Lister</v-app-bar-title>
				</v-app-bar>
				<v-main>
					<v-container>
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
						</v-tabs-window>
					</v-container>
				</v-main>
			</v-app>
		</NuxtLayout>
	</div>
</template>

<script setup>
const config = useRuntimeConfig();
import { ref, watchEffect, onMounted } from "vue";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import nuxtStorage from "nuxt-storage";
const NOCODB_BASEURL = config.public.NOCODB_BASEURL;
const NOCODB_APIKEY = config.public.NOCODB_APIKEY;
const activeTab = ref(0);
const newItem = ref({
	title: null,
	contents: null,
	comments: null,
	boxType: null,
	publicid: null,
});
const boxTypes = ["Kitchen", "Living Room", "Shoes", "Keller", "Others", "Computer Parts", "Food", "Clothes", "Dining", "Carina Room", "Calvin Room"];
const loading = ref(false); // For showing the loader
const imagePreview = ref(null); // To hold the image preview URL
const imageFile = ref(null); // To hold the image file

// editor's content
const editor = useEditor({
	content: newItem.value.contents,
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

// Function to save form data in localStorage
const saveToLocalStorage = () => {
	nuxtStorage.localStorage.setData("newItem", JSON.stringify(newItem.value));
};

// Function to load form data from localStorage
const loadFromLocalStorage = () => {
	const savedItem = nuxtStorage.localStorage.getData("newItem");
	if (savedItem) {
		Object.assign(newItem.value, JSON.parse(savedItem));
		if (newItem.value.contents && editor.value) {
			editor.value.commands.setContent(newItem.value.contents);
		}
	} else {
		nuxtStorage.localStorage.setData("newItem", JSON.stringify(newItem.value));
	}
};

// Watch the form data and save it to localStorage whenever it changes

watch(
	newItem,
	(newVal, oldVal) =>{
    saveToLocalStorage(); // Save to localStorage whenever there's a change
  },
  { deep: true }
);
// Editor update function
const updateEditorContents = () => {
  newItem.value.contents = editor.value.getHTML(); // Manually update contents field
};

// Set a listener for editor content changes
watchEffect(() => {
  if (editor.value) {
    editor.value.on('update', updateEditorContents);
  }
});

// Load data from localStorage when the component is mounted
onMounted(() => {
	loadFromLocalStorage();
});

// File handling
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
			publicurl: `https://${useRequestURL().hostname}/viewer/?qid=${genId}`,
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
		// console.log(data);
		alert(`Successfully Created Box Record ID - ${data.Id}`);

		// Clear form and localStorage after successful submission
		newItem.value = { title: "", contents: "", comments: "", boxType: null, publicid: null, publicurl: null };
		imagePreview.value = null;
		imageFile.value = null;
		nuxtStorage.localStorage.removeItem("newItem"); // Clear localStorage
		// Reset editor content
		editor.value.commands.setContent(""); // Clear the editor
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
