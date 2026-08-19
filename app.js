// PixelForge AI — Gemini Style
var App = {
    isGenerating: false,
    currentModel: "flash",
    isPro: false,
    generationsLeft: 10,

    init: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        var self = this;

        // Prompt input auto-resize
        var promptInput = document.getElementById("promptInput");
        promptInput.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = Math.min(this.scrollHeight, 120) + "px";
        });

        // Enter to generate
        promptInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                self.generateImage();
            }
        });

        // Upload button
        document.getElementById("uploadBtn").addEventListener("click", function() {
            document.getElementById("fileInput").click();
        });

        document.getElementById("fileInput").addEventListener("change", function(e) {
            if (e.target.files && e.target.files[0]) {
                self.toast("Image uploaded", "success");
            }
        });

        // Model dropdown
        document.getElementById("modelBtn").addEventListener("click", function(e) {
            e.stopPropagation();
            document.getElementById("modelDropdown").classList.toggle("hidden");
        });

        document.querySelectorAll(".model-option").forEach(function(opt) {
            opt.addEventListener("click", function() {
                self.selectModel(this.dataset.model, this);
            });
        });

        document.addEventListener("click", function() {
            document.getElementById("modelDropdown").classList.add("hidden");
        });

        // Generate button
        document.getElementById("promptInput").addEventListener("keydown", function(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                self.generateImage();
            }
        });

        // Chips
        document.querySelectorAll(".chip").forEach(function(chip) {
            chip.addEventListener("click", function() {
                document.getElementById("promptInput").value = this.dataset.prompt;
                self.generateImage();
            });
        });

        // Bottom nav
        document.querySelectorAll(".bottom-nav .nav-link").forEach(function(link) {
            link.addEventListener("click", function(e) {
                e.preventDefault();
                document.querySelectorAll(".bottom-nav .nav-link").forEach(function(l) { l.classList.remove("active"); });
                this.classList.add("active");
                self.toast(this.dataset.page + " page coming soon!", "info");
            });
        });

        // Upgrade
        document.getElementById("upgradeBtn").addEventListener("click", function() {
            self.openModal();
        });
        document.getElementById("closeModal").addEventListener("click", function() {
            self.closeModal();
        });
        document.getElementById("subscribeBtn").addEventListener("click", function() {
            self.upgradeToPro();
        });

        // Result actions
        document.getElementById("downloadBtn").addEventListener("click", function() {
            self.toast("Image downloaded", "success");
        });
        document.getElementById("shareBtn").addEventListener("click", function() {
            self.toast("Link copied", "success");
        });
        document.getElementById("regenerateBtn").addEventListener("click", function() {
            self.generateImage();
        });
    },

    selectModel: function(model, element) {
        this.currentModel = model;
        document.querySelectorAll(".model-option").forEach(function(o) { o.classList.remove("active"); });
        element.classList.add("active");

        var names = { flash: "Flash", pro: "Pro" };
        document.getElementById("currentModel").textContent = names[model] || "Flash";
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
            this.toast("Daily limit reached", "error");
            this.openModal();
            return;
        }

        this.isGenerating = true;

        // Hide center stage, show generating
        document.getElementById("centerStage").classList.add("hidden");
        document.getElementById("generatingState").classList.remove("hidden");
        document.getElementById("resultState").classList.add("hidden");

        var self = this;
        setTimeout(function() {
            self.showResult(prompt);
        }, 2500);
    },

    showResult: function(prompt) {
        this.isGenerating = false;

        document.getElementById("generatingState").classList.add("hidden");
        document.getElementById("resultState").classList.remove("hidden");

        // Random image based on prompt keywords
        var images = [
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=600&fit=crop",
            "https://images.unsplash.com/photo-1633218388467-539651dcf81a?w=600&h=600&fit=crop",
            "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=600&h=600&fit=crop",
            "https://images.unsplash.com/photo-1515630278258-407f66498911?w=600&h=600&fit=crop",
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop",
            "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&h=600&fit=crop"
        ];
        var randomImage = images[Math.floor(Math.random() * images.length)];

        document.getElementById("resultImage").src = randomImage;
        document.getElementById("resultPromptText").textContent = '"' + prompt + '"';

        if (!this.isPro) {
            this.generationsLeft--;
        }

        this.toast("Image generated!", "success");
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
        document.getElementById("upgradeBtn").style.display = "none";
        this.toast("Welcome to Pro!", "success");
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