<template>
	<div>
		<NuxtLayout>
			<v-app>
				<v-app-bar color="primary">
					<template v-slot:prepend>
						<v-btn @click="backToHome"><v-icon>mdi-arrow-left-top</v-icon></v-btn>
					</template>
					<v-app-bar-title>Box Lister</v-app-bar-title>
				</v-app-bar>
				<v-main>
					<v-container>
						<v-card>
							<v-card-text>
								<!-- Form for Editing Data -->
								<v-form v-if="formData" @submit.prevent="saveData">
									<v-row>
										<!-- Left Column: ID, Title, Box Type -->
										<v-col cols="12" md="6">
											<v-text-field v-model="formData.Id" label="ID" readonly></v-text-field>
											<v-text-field v-model="formData.Title" label="Title" :readonly="!isEditing" required></v-text-field>
											<v-select v-model="formData['Box Type']" :items="boxTypes" label="Box Type" :disabled="!isEditing"></v-select>
										</v-col>

										<!-- Right Column: QR Code -->
										<v-col cols="12" md="6" class="d-flex justify-center">
											<qrcode-vue :value="formData.qr" :size="150" level="H" />
										</v-col>
									</v-row>

									<!-- Contents Editor -->
									<v-card flat title="Contents">
										<v-card-text>
											<div class="toolbar" v-if="isEditing">
												<v-btn @click="toggleBold"><v-icon>mdi-format-bold</v-icon></v-btn>
												<v-btn @click="toggleItalic"><v-icon>mdi-format-italic</v-icon></v-btn>
												<v-btn @click="toggleBulletList"><v-icon>mdi-format-list-bulleted</v-icon></v-btn>
											</div>
											<EditorContent :editor="editor" class="custom-editor" />
										</v-card-text>
									</v-card>

									<!-- Comments Field -->
									<v-textarea v-model="formData.Comments" label="Comments" :readonly="!isEditing"></v-textarea>

									<!-- Edit / Save Buttons -->
									<v-row>
										<v-col cols="12">
											<v-btn v-if="!isEditing" color="warning" block @click="enableEditing">Edit</v-btn>
											<v-btn v-if="isEditing" type="submit" color="success" block>Save</v-btn>
										</v-col>
									</v-row>
									<v-row>
										<v-col cols="12">
											<v-btn v-if="isEditing" color="error" block @click="cancelEditing">Cancel</v-btn>
										</v-col>
									</v-row>

									<!-- Assets Linked Section -->
									<v-card-title>Assets Linked</v-card-title>
									<v-divider></v-divider>
									<v-card flat>
										<v-card-text>
											<v-row>
												<v-col v-for="(asset, index) in assets" :key="index" cols="12" sm="6" md="4">
													<v-card>
														<v-img :src="asset.imageUrl" alt="Asset Image" height="200px"></v-img>
														<v-card-title>{{ asset.name }}</v-card-title>
													</v-card>
												</v-col>
											</v-row>
										</v-card-text>
									</v-card>
								</v-form>

								<!-- Loader while fetching data -->
								<v-progress-circular v-else indeterminate></v-progress-circular>
							</v-card-text>
						</v-card>
					</v-container>
				</v-main>
			</v-app>
		</NuxtLayout>
	</div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import axios from "axios";
import QrcodeVue from "qrcode.vue";

// Runtime Config and State Variables
const config = useRuntimeConfig();
const NOCODB_BASEURL = config.public.NOCODB_BASEURL;
const NOCODB_APIKEY = config.public.NOCODB_APIKEY;
const formData = ref(null);
const isEditing = ref(false); // Controls the form's edit mode
const boxTypes = ["Kitchen", "Living Room", "Shoes", "Keller", "Others", "Computer Parts", "Food", "Clothes", "Dining", "Carina Room", "Calvin Room"];
const assets = ref([]); // To store assets

// Route and Editor Content
const route = useRoute();
const content = ref("");
const editor = useEditor({
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

// Enable Editing Function
const enableEditing = () => {
	isEditing.value = true;
};

// Cancel Editing Function
const cancelEditing = () => {
	isEditing.value = false;
	// Optionally, reload original data if user cancels editing
	loadData();
};

const backToHome = async () =>{ 
	await navigateTo({ path: '/' });
}

// Fetch and Load Data
const loadData = async () => {
	const qid = route.query.qid;

	if (qid) {
		try {
			const response = await axios.get(`${NOCODB_BASEURL}/tables/mndechcrzo8xna3/records?where=(publicid,eq,${qid})`, {
				headers: {
					"Content-Type": "multipart/form-data",
					"xc-token": NOCODB_APIKEY,
				},
			});

			if (response) {
				formData.value = response.data.list[0];
				assets.value = response.data.list[0].Assets.map((asset) => ({
					name: asset.title, // Assuming the schema has a title field for the asset
					imageUrl: asset.signedUrl, // Replace with the actual field containing the image URL
				}));

				if (editor.value) {
					editor.value.commands.setContent(response.data.list[0].Contents);
				}
			}
		} catch (error) {
			console.error("Error fetching data:", error);
		}
	}
};

onMounted(() => {
	loadData();
});

// Save Data
const saveData = async () => {
	try {
		const myData = {
			Id: parseInt(formData.value.Id),
			Title: formData.value.Title,
			Contents: formData.value.Contents,
			Comments: formData.value.Comments,
			"Box Type": formData.value["Box Type"],
		};
		console.log(myData);

		const result = await axios.patch(`${NOCODB_BASEURL}/tables/mndechcrzo8xna3/records`, myData, {
			headers: {
				"Content-Type": "application/json",
				"xc-token": NOCODB_APIKEY,
			},
		});
		if (result) {
			alert("Data saved successfully!");
			isEditing.value = false; // Disable editing after save
		}
	} catch (error) {
		console.error("Error saving data:", error);
	}
};
</script>
