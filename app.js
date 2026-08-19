// PixelForge AI — Create with AI
var App = {
    isGenerating: false,
    currentModel: "v2",
    currentRatio: "1:1",
    currentStyle: "none",
    currentQuality: "standard",
    isPro: false,
    generationsLeft: 10,
    history: [],

    init: function() {
        this.bindEvents();
        this.updateGenerationsLeft();
    },

    bindEvents: function() {
        var self = this;

        // Sidebar navigation
        document.querySelectorAll(".nav-item").forEach(function(item) {
            item.addEventListener("click", function(e) {
                e.preventDefault();
                self.switchPage(this.dataset.section);
            });
        });

        // New creation button
        document.getElementById("newBtn").addEventListener("click", function() {
            self.resetGenerate();
            self.switchPage("generate");
        });

        // Mobile sidebar toggle
        document.getElementById("sidebarToggle").addEventListener("click", function() {
            document.getElementById("sidebar").classList.toggle("open");
        });

        // Upgrade modal
        document.getElementById("upgradeBtn").addEventListener("click", function() {
            self.openModal();
        });
        document.getElementById("closeModal").addEventListener("click", function() {
            self.closeModal();
        });
        document.getElementById("subscribeBtn").addEventListener("click", function() {
            self.upgradeToPro();
        });

        // Model selector
        document.getElementById("modelBtn").addEventListener("click", function(e) {
            e.stopPropagation();
            document.getElementById("modelDropdown").classList.toggle("hidden");
        });

        document.querySelectorAll(".model-option").forEach(function(opt) {
            opt.addEventListener("click", function() {
                if (this.classList.contains("pro-only") && !self.isPro) {
                    self.toast("Upgrade to Pro to use this model", "error");
                    return;
                }
                self.selectModel(this.dataset.model, this);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", function() {
            document.getElementById("modelDropdown").classList.add("hidden");
        });

        // Generate button
        document.getElementById("generateBtn").addEventListener("click", function() {
            self.generateImage();
        });

        // Prompt input auto-resize
        var promptInput = document.getElementById("promptInput");
        promptInput.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = Math.min(this.scrollHeight, 120) + "px";
        });

        // Enter key to generate
        promptInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                self.generateImage();
            }
        });

        // Aspect ratio buttons
        document.querySelectorAll(".ratio-btn").forEach(function(btn) {
            btn.addEventListener("click", function() {
                if (this.classList.contains("pro-only") && !self.isPro) {
                    self.toast("Upgrade to Pro for this ratio", "error");
                    return;
                }
                document.querySelectorAll(".ratio-btn").forEach(function(b) { b.classList.remove("active"); });
                this.classList.add("active");
                self.currentRatio = this.dataset.ratio;
            });
        });

        // Style select
        document.getElementById("styleSelect").addEventListener("change", function() {
            self.currentStyle = this.value;
        });

        // Quality buttons
        document.querySelectorAll(".q-btn").forEach(function(btn) {
            btn.addEventListener("click", function() {
                if (this.classList.contains("pro-only") && !self.isPro) {
                    self.toast("Upgrade to Pro for HD quality", "error");
                    return;
                }
                document.querySelectorAll(".q-btn").forEach(function(b) { b.classList.remove("active"); });
                this.classList.add("active");
                self.currentQuality = this.dataset.quality;
            });
        });

        // Upload button
        document.getElementById("uploadBtn").addEventListener("click", function() {
            document.getElementById("fileInput").click();
        });

        document.getElementById("fileInput").addEventListener("change", function(e) {
            if (e.target.files && e.target.files[0]) {
                self.toast("Reference image uploaded", "success");
            }
        });

        // Recent items
        document.querySelectorAll(".recent-item").forEach(function(item) {
            item.addEventListener("click", function() {
                document.getElementById("promptInput").value = this.dataset.prompt;
                self.switchPage("generate");
            });
        });

        // Result actions
        document.getElementById("downloadBtn").addEventListener("click", function() {
            self.toast("Image downloaded", "success");
        });
        document.getElementById("shareBtn").addEventListener("click", function() {
            self.toast("Link copied to clipboard", "success");
        });
        document.getElementById("variationsBtn").addEventListener("click", function() {
            self.toast("Creating variations...", "info");
        });
    },

    switchPage: function(page) {
        // Update nav
        document.querySelectorAll(".nav-item").forEach(function(item) {
            item.classList.toggle("active", item.dataset.section === page);
        });

        // Show page
        document.querySelectorAll(".page").forEach(function(p) { p.classList.remove("active"); });
        document.getElementById("page-" + page).classList.add("active");

        // Close mobile sidebar
        document.getElementById("sidebar").classList.remove("open");
    },

    selectModel: function(model, element) {
        this.currentModel = model;
        document.querySelectorAll(".model-option").forEach(function(o) { o.classList.remove("active"); });
        element.classList.add("active");

        var modelNames = { v2: "PixelForge V2", v1: "PixelForge V1", hd: "PixelForge HD" };
        document.getElementById("currentModel").textContent = modelNames[model] || "PixelForge V2";
        document.getElementById("modelDropdown").classList.add("hidden");
    },

    generateImage: function() {
        if (this.isGenerating) return;

        var prompt = document.getElementById("promptInput").value.trim();
        if (!prompt) {
            this.toast("Please enter a prompt", "error");
            return;
        }

        if (!this.isPro && this.generationsLeft <= 0) {
            this.toast("Daily limit reached. Upgrade to Pro!", "error");
            this.openModal();
            return;
        }

        this.isGenerating = true;
        document.getElementById("generateBtn").disabled = true;
        document.getElementById("emptyState").classList.add("hidden");
        document.getElementById("imageResult").classList.add("hidden");
        document.getElementById("generatingState").classList.remove("hidden");

        // Simulate generation progress
        var progress = 0;
        var progressBar = document.getElementById("genProgress");
        var generatingText = document.getElementById("generatingText");
        var texts = [
            "Initializing neural network",
            "Analyzing prompt semantics",
            "Generating base composition",
            "Applying style filters",
            "Refining details",
            "Finalizing image"
        ];

        var self = this;
        var interval = setInterval(function() {
            progress += Math.random() * 15 + 5;
            if (progress > 100) progress = 100;
            progressBar.style.width = progress + "%";

            var textIndex = Math.min(Math.floor(progress / 20), texts.length - 1);
            generatingText.textContent = texts[textIndex];

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(function() {
                    self.showResult(prompt);
                }, 500);
            }
        }, 400);
    },

    showResult: function(prompt) {
        this.isGenerating = false;
        document.getElementById("generateBtn").disabled = false;
        document.getElementById("generatingState").classList.add("hidden");
        document.getElementById("imageResult").classList.remove("hidden");

        // Pick a random image based on style
        var images = {
            none: [
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&h=700&fit=crop",
                "https://images.unsplash.com/photo-1633218388467-539651dcf81a?w=700&h=700&fit=crop",
                "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=700&h=700&fit=crop"
            ],
            photorealistic: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&h=700&fit=crop"],
            anime: ["https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700&h=700&fit=crop"],
            "digital-art": ["https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=700&h=700&fit=crop"],
            "oil-painting": ["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=700&h=700&fit=crop"],
            "3d-render": ["https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=700&h=700&fit=crop"],
            sketch: ["https://images.unsplash.com/photo-1615184697985-c9bde1b07da7?w=700&h=700&fit=crop"],
            cinematic: ["https://images.unsplash.com/photo-1515630278258-407f66498911?w=700&h=700&fit=crop"]
        };

        var styleImages = images[this.currentStyle] || images.none;
        var randomImage = styleImages[Math.floor(Math.random() * styleImages.length)];

        document.getElementById("generatedImage").src = randomImage;
        document.getElementById("resultPrompt").textContent = prompt;
        document.getElementById("resultModel").textContent = document.getElementById("currentModel").textContent;
        document.getElementById("resultSize").textContent = this.currentRatio;

        // Update generations left
        if (!this.isPro) {
            this.generationsLeft--;
            this.updateGenerationsLeft();
        }

        // Add to history
        this.addToHistory(prompt, randomImage);

        this.toast("Image generated successfully!", "success");
    },

    resetGenerate: function() {
        document.getElementById("promptInput").value = "";
        document.getElementById("emptyState").classList.remove("hidden");
        document.getElementById("imageResult").classList.add("hidden");
        document.getElementById("generatingState").classList.add("hidden");
        document.getElementById("genProgress").style.width = "0%";
    },

    updateGenerationsLeft: function() {
        var userPlan = document.querySelector(".user-plan");
        if (userPlan && !this.isPro) {
            userPlan.textContent = this.generationsLeft + " left today";
        }
    },

    addToHistory: function(prompt, image) {
        var recentList = document.getElementById("recentList");
        var newItem = document.createElement("div");
        newItem.className = "recent-item";
        newItem.dataset.prompt = prompt;
        newItem.innerHTML = '<img src="' + image + '" alt=""><span>' + prompt.substring(0, 30) + (prompt.length > 30 ? "..." : "") + "</span>";

        var self = this;
        newItem.addEventListener("click", function() {
            document.getElementById("promptInput").value = this.dataset.prompt;
            self.switchPage("generate");
        });

        recentList.insertBefore(newItem, recentList.firstChild);

        // Keep only 5 recent items
        while (recentList.children.length > 5) {
            recentList.removeChild(recentList.lastChild);
        }
    },

    openModal: function() {
        document.getElementById("upgradeModal").classList.remove("hidden");
    },

    closeModal: function() {
        document.getElementById("upgradeModal").classList.add("hidden");
    },

    upgradeToPro: function() {
        this.isPro = true;
        this.closeModal();

        // Update UI
        document.querySelector(".user-plan").textContent = "Pro Plan";
        document.getElementById("upgradeBtn").style.display = "none";

        // Unlock pro features
        document.querySelectorAll(".pro-only").forEach(function(el) {
            el.style.opacity = "1";
            el.style.pointerEvents = "auto";
        });

        this.toast("Welcome to PixelForge Pro!", "success");
    },

    toast: function(message, type) {
        type = type || "info";
        var icon = type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle";
        var toast = document.createElement("div");
        toast.className = "toast " + type;
        toast.innerHTML = '<i class="fas fa-' + icon + '"></i><span>' + message + '</span>';
        document.getElementById("toastContainer").appendChild(toast);
        setTimeout(function() { toast.remove(); }, 3000);
    }
};

document.addEventListener("DOMContentLoaded", function() {
    App.init();
});