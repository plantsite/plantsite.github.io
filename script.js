// JavaScript code
var currentPage = 1;
var itemsPerPage = calculateItemsPerPage() * 5;
var dataContainer = document.getElementById("dataContainer");
var loadingMsg = document.getElementById("loadingMsg");
var sortedData; // Global variable to store the sorted data
var displayedSpeciesNames = [];

function calculateItemsPerPage() {
    var windowHeight = window.innerHeight;
    var itemHeight = 80; // Adjust this value based on your item height
    return Math.ceil(windowHeight / itemHeight);
}

function createFamilyElement(family) {
    var familyElement = document.createElement("div");
    familyElement.className = "family-item";
    familyElement.textContent = family;
    familyElement.addEventListener("click", function () {
        redirectToWikipedia(family);
    });

    return familyElement;
}

function createGenusElement(genus) {
    var genusElement = document.createElement("div");
    genusElement.className = "genus-item";
    genusElement.textContent = genus;
    genusElement.addEventListener("click", function () {
        redirectToWikipedia(genus);
    });
    return genusElement;
}

function createSpeciesElement(name, imageUrl) {
    var speciesElement = document.createElement("div");
    speciesElement.className = "species-item";

    if (imageUrl) {
        var imageElement = document.createElement("img");
        imageElement.className = "species-image";
        imageElement.src = imageUrl;
        speciesElement.appendChild(imageElement);
    } else {
        var noImageElement = document.createElement("div");
        noImageElement.className = "no-image";
        speciesElement.appendChild(noImageElement);
    }

    var nameElement = document.createElement("div");
    nameElement.className = "species-name";
    nameElement.textContent = name;
    speciesElement.appendChild(nameElement);

    speciesElement.addEventListener("click", function() {
        redirectToSpeciesOrGenus(name, name.split(" ")[0]);
    });

    return speciesElement;
}

function redirectToSpeciesOrGenus(speciesName, genus) {
    var wikipediaApiUrl = "https://en.wikipedia.org/w/api.php";
    var speciesUrl = "https://en.wikipedia.org/wiki/" + encodeURIComponent(speciesName);
    var genusUrl = "https://en.wikipedia.org/wiki/" + encodeURIComponent(genus);

    var urlToOpen = speciesUrl;

    // Function to check if a Wikipedia page exists
    function pageExists(pageUrl) {
        var apiUrl = wikipediaApiUrl + "?format=json&action=query&prop=extracts&exintro&explaintext&titles=" + encodeURIComponent(pageUrl) + "&origin=*&redirects=true";
        return fetch(apiUrl)
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                var pages = data.query.pages;
                var pageId = Object.keys(pages)[0];
                console.log("Page ID:", pageId);
                return pageId !== "-1";
            })
            .catch(function(error) {
                console.error("Error:", error);
                return false;
            });
    }

    // Check if the species page exists
    pageExists(speciesName)
        .then(function(exists) {
            if (!exists) {
                urlToOpen = genusUrl;
            }

            // Open the Wikipedia page in a new tab
            window.open(urlToOpen, "_blank");
        })
        .catch(function(error) {
            console.error("Error:", error);
        });
}

function redirectToWikipedia(keyword) {
    var wikipediaUrl = "https://en.wikipedia.org/wiki/" + encodeURIComponent(keyword);
    window.open(wikipediaUrl, "_blank");
}

function fetchData(callback) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/json");
    xhr.open("GET", "plants/species.json", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            sortedData = sortData(data);
            callback();
        }
    };
    xhr.send();
}

function appendData() {
    var startIndex = (currentPage - 1) * itemsPerPage;
    var endIndex = startIndex + itemsPerPage;
    var speciesCount = 0;

    for (var family in sortedData) {
        var familyElement = createFamilyElement(family);
        var xpath =
            "//div[text()='" + familyElement.textContent + "']";
        var matchingElement = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        // only add family if it doesn't exist
        if (matchingElement === null) {
            dataContainer.appendChild(familyElement);
        }

        for (var genus in sortedData[family]) {
            var genusElement = createGenusElement(genus);

            xpath = "//div[text()='" + genusElement.textContent + "']";
            matchingElement = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            // only add genus if it doesn't exist
            if (matchingElement === null) {
                dataContainer.appendChild(genusElement);
            }

            var species = sortedData[family][genus];
            for (var i = 0; i < species.length; i++) {
                if (speciesCount >= startIndex && speciesCount < endIndex) {
                    var speciesData = species[i];
                    var speciesName;
                    var speciesImage;

                    if (typeof speciesData === "string") {
                        speciesName = speciesData;
                        speciesImage = "no-image.png";
                    } else {
                        speciesName = speciesData.name;
                        speciesImage = speciesData.image_url;
                    }

                    var speciesElement = createSpeciesElement(
                        speciesName,
                        speciesImage
                    );
                    dataContainer.appendChild(speciesElement);
                }
                speciesCount++;

                // Check if reached the end
                if (speciesCount >= endIndex) {
                    return;
                }
            }
        }
    }

    // Check if there is more data to load
    if (speciesCount <= endIndex) {
        window.removeEventListener("scroll", handleScroll);
    } else {
        loadingMsg.style.display = "none";
    }
}

function sortData(data) {
    var sortedData = {};

    // Sort by family
    var sortedFamilies = Object.keys(data["Plantae"]).sort();
    for (var i = 0; i < sortedFamilies.length; i++) {
        var family = sortedFamilies[i];
        sortedData[family] = {};

        // Sort by genus within each family
        var sortedGenera = Object.keys(data["Plantae"][family]).sort();
        for (var j = 0; j < sortedGenera.length; j++) {
            var genus = sortedGenera[j];
            sortedData[family][genus] = data["Plantae"][family][genus];
        }
    }

    return sortedData;
}

function handleScroll() {
    if ((window.innerHeight + window.scrollY >= document.documentElement.offsetHeight)) {
        console.log("Reached the bottom of the page");

        loadingMsg.style.display = "block";
        currentPage++;
        console.log("Current page: " + currentPage);

        if (searchInput.value.trim() === "") {
            console.log("Appending data");
            appendData();
        } else {
            console.log("Performing search");
            performScrollSearch();
        }
    }
}

function performScrollSearch() {
    var searchTerm = searchInput.value.trim().toLowerCase();

    var searchResults = [];
    var maxResults = calculateItemsPerPage() * 5; // Specify the maximum number of search results to display

    for (var family in sortedData) {
        for (var genus in sortedData[family]) {
            var species = sortedData[family][genus];
            for (var i = 0; i < species.length; i++) {
                var speciesData = species[i];
                var speciesName, speciesImage;

                if (typeof speciesData === "string") {
                    speciesName = speciesData;
                    speciesImage = "no-image.png";
                } else {
                    speciesName = speciesData.name;
                    speciesImage = speciesData.image_url;
                }

                if (speciesName.toLowerCase().indexOf(searchTerm) !== -1 && !displayedSpeciesNames.includes(speciesName)) {
                    searchResults.push(speciesData);
                    displayedSpeciesNames.push(speciesName);
                }

                if (searchResults.length === maxResults) {
                    displaySearchResults(searchResults);
                    return;
                }
            }
        }
    }

    displaySearchResults(searchResults);
}

function displaySearchResults(results) {
    var searchContainer = document.createElement("div");
    searchContainer.className = "search-results-container";
    dataContainer.appendChild(searchContainer);
    if (results.length > 0) {
        for (var j = 0; j < results.length; j++) {
            var searchResult = results[j];
            var searchResultElement = createSpeciesElement(
                searchResult.name || searchResult,
                searchResult.image_url || "no-image.png"
            );
            searchContainer.appendChild(searchResultElement);
        }
    } else {
        var noResultsElement = document.createElement("div");
        noResultsElement.className = "no-results";
        noResultsElement.textContent = "No results found.";
        searchContainer.appendChild(noResultsElement);
    }
}

function searchHandler() {
    displayedSpeciesNames = [];
    var searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm === "") {
        // Clear search
        dataContainer.innerHTML = "";
        currentPage = 1;
        searchResults = [];
        appendData();
    } else {
        // Perform search
        searchResults = [];

        for (var family in sortedData) {
            for (var genus in sortedData[family]) {
                var species = sortedData[family][genus];
                for (var i = 0; i < species.length; i++) {
                    var speciesData = species[i];
                    var speciesName, speciesImage;

                    if (typeof speciesData === "string") {
                        speciesName = speciesData;
                        speciesImage = "no-image.png";
                    } else {
                        speciesName = speciesData.name;
                        speciesImage = speciesData.image_url;
                    }

                    if (speciesName.toLowerCase().indexOf(searchTerm) !== -1) {
                        searchResults.push(speciesData);
                    }
                }
            }
        }

        // Display search results
        dataContainer.innerHTML = "";
        searchContainer = document.createElement("div");
        searchContainer.className = "search-results-container";
        dataContainer.appendChild(searchContainer);

        if (searchResults.length > 0) {
            appendSearchResults();
        }
        else {
            var noResultsElement = document.createElement("div");
            noResultsElement.className = "no-results";
            noResultsElement.textContent = "No results found.";
            searchContainer.appendChild(noResultsElement);
        }

    }
}

function appendSearchResults() {
    var startIndex = (currentPage - 1) * itemsPerPage;
    var endIndex;
    var speciesCount = 0;

    if (searchResults.length > calculateItemsPerPage()*5) {
        endIndex = startIndex + itemsPerPage;
    } else {
        endIndex = searchResults.length;
    }


    for (var i = 0; i < searchResults.length; i++) {
        if (speciesCount >= startIndex && speciesCount < endIndex) {
            var searchResult = searchResults[i];
            var searchResultElement = createSpeciesElement(
                searchResult.name || searchResult,
                searchResult.image_url || "no-image.png"
            );
            searchContainer.appendChild(searchResultElement);
        }
        speciesCount++;

        // Check if reached the end
        if (speciesCount >= endIndex) {
            loadingMsg.style.display = "none";
            return;
        }
    }

    // Check if there is more data to load
    if (speciesCount <= endIndex) {
        window.removeEventListener("scroll", handleScroll);
    } else {
        loadingMsg.style.display = "none";
    }
}

// Event listeners
searchButton.addEventListener("click", searchHandler);
searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        searchHandler();
    }
});

// Initial data loading
function loadData() {
    fetchData(function () {
        appendData();
        window.addEventListener("scroll", handleScroll);
    });
}

loadData();
