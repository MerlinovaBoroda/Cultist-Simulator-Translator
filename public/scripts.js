const originalContent = document.getElementById("originalContent");
        const ukrainianContent = document.getElementById("ukrainianContent");

        function syncScroll() {
            originalContent.scrollTop = ukrainianContent.scrollTop;
        }

        ukrainianContent.addEventListener("scroll", syncScroll);

        document.addEventListener("DOMContentLoaded", () => {
            const fileSelect = document.getElementById("fileSelect");
            const originalContent = document.getElementById("originalContent");
            const ukrainianContent = document.getElementById("ukrainianContent");
            const saveButton = document.getElementById("saveButton");

            // Fetch and populate file list
            fetch("/files")
                .then(response => response.json())
                .then(files => {
                    files.forEach(file => {
                        const option = document.createElement("option");
                        option.value = file;
                        option.textContent = file;
                        fileSelect.appendChild(option);
                    });
                });

            // Load selected file
            // fileSelect.addEventListener("change", () => {
            //     const filePath = fileSelect.value;
            //     fetch(`/file?path=${encodeURIComponent(filePath)}`)
            //         .then(response => response.json())
            //         .then(data => {
            //             originalContent.value = JSON.stringify(data.original, null, 2);
            //             ukrainianContent.value = JSON.stringify(data.ukrainian, null, 2);
            //         });
            // });
            fileSelect.addEventListener("change", () => {
                const filePath = fileSelect.value;
                fetch(`/file?path=${encodeURIComponent(filePath)}`)
                    .then(response => response.json())
                    .then(data => {
                        // Use innerHTML for div elements instead of value
                        renderJSON(data.original, 'originalContent');
                        renderJSON(data.ukrainian, 'ukrainianContent');
                    });
            });

            // Function to render JSON with special row styles for label, description, message, comment, rumour, and fragmentsecret
            function renderJSON(jsonData, containerId) {
                const container = document.getElementById(containerId);
                let formattedHTML = JSON.stringify(jsonData, null, 4)  // Indented JSON
                    .replace(/"label":/g, '"<span class="label">label</span>":')
                    .replace(/"([^"]*descript[^"]*)":/g, '"<span class="description">$1</span>":')
                    .replace(/"([^"]*message[^"]*)":/gi, '"<span class="message">$1</span>":')
                    .replace(/"([^"]*comment[^"]*)":/gi, '"<span class="comment">$1</span>":')
                    .replace(/"([^"]*rumour[^"]*)":/gi, '"<span class="rumour">$1</span>":')
                    .replace(/"([^"]*fragmentsecret[^"]*)":/gi, '"<span class="fragmentsecret">$1</span>":');

                container.innerHTML = formattedHTML; // Update content of div
            }



            // Save updated Ukrainian file
            saveButton.addEventListener("click", () => {
                const filePath = fileSelect.value;
                let newData;
                try {
                    newData = JSON.parse(ukrainianContent.innerText);
                } catch (error) {
                    alert("Invalid JSON format");
                    return;
                }
                
                fetch("/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filePath, newData })
                }).then(response => response.json())
                  .then(result => {
                      if (result.success) alert("File saved successfully!");
                  });
            });
        });