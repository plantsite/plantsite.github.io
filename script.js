var currentPage = 1;
var itemsPerPage = calculateItemsPerPage() * 5;
var dataContainer = document.getElementById("dataContainer");
var loadingMsg = document.getElementById("loadingMsg");
var sortedData; 
var displayedSpeciesNames = [];

function calculateItemsPerPage() {
    var windowHeight = window.innerHeight;
    var itemHeight = 80; 
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

    pageExists(speciesName)
        .then(function(exists) {
            if (!exists) {
                urlToOpen = genusUrl;
            }

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

                if (speciesCount >= endIndex) {
                    return;
                }
            }
        }
    }

    if (speciesCount <= endIndex) {
        window.removeEventListener("scroll", handleScroll);
    } else {
        loadingMsg.style.display = "none";
    }
}

function sortData(data) {
    var sortedData = {};

    var sortedFamilies = Object.keys(data["Plantae"]).sort();
    for (var i = 0; i < sortedFamilies.length; i++) {
        var family = sortedFamilies[i];
        sortedData[family] = {};

        var sortedGenera = Object.keys(data["Plantae"][family]).sort();
        for (var j = 0; j < sortedGenera.length; j++) {
            var genus = sortedGenera[j];
            sortedData[family][genus] = data["Plantae"][family][genus];
        }
    }

    return sortedData;
}

function handleScroll() {
    console.log("Scrolling");
    console.log("Window height: " + window.innerHeight);
    console.log("Scroll Y: " + window.scrollY);
    console.log("Document height: " + document.documentElement.offsetHeight);
    if ((window.innerHeight + window.scrollY >= document.documentElement.offsetHeight-1)) {
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
    var maxResults = calculateItemsPerPage() * 5; 

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

                var relevance = calculateRelevance(speciesName, searchTerm);

                if (relevance > 0 && !displayedSpeciesNames.includes(speciesName)) {
                    searchResults.push({
                        data: speciesData,
                        relevance: relevance
                    });

                    searchResults.sort(function (a, b) {
                        return b.relevance - a.relevance;
                    });

                    searchResults = searchResults.slice(0, maxResults);
                }
            }
        }
    }

    displaySearchResults(searchResults.map(result => result.data));
}

function rollDice() {
    var totalPlants = 0;

    for (var family in sortedData) {
        for (var genus in sortedData[family]) {
            var species = sortedData[family][genus];
            totalPlants += species.length;
        }
    }

    var randomIndex = Math.floor(Math.random() * totalPlants);

    var currentPlantIndex = 0;
    var selectedPlant;

    for (var family in sortedData) {
        for (var genus in sortedData[family]) {
            var species = sortedData[family][genus];
            for (var i = 0; i < species.length; i++) {
                if (currentPlantIndex === randomIndex) {
                    selectedPlant = species[i];
                    break;
                }
                currentPlantIndex++;
            }
            if (selectedPlant) {
                break;
            }
        }
        if (selectedPlant) {
            break;
        }
    }

    if (selectedPlant) {
        var plantName = typeof selectedPlant === "string" ? selectedPlant : selectedPlant.name;
        var plantImageUrl = typeof selectedPlant === "string" ? "no-image.png" : selectedPlant.image_url;

        var wikipediaLink = "https://en.wikipedia.org/wiki/" + encodeURIComponent(plantName);

        pageExists(wikipediaLink)
            .then(function (exists) {

                var message = "You rolled a random plant:\n\n" +
                    "Name: " + plantName + "\n";

                if (plantImageUrl !== "no-image.png") {
                    message += "Image URL: https:" + plantImageUrl + "\n";
                }

                if (exists) {
                    message += "Wikipedia Link: " + wikipediaLink;

                    alert(message);

                    window.open(wikipediaLink, "_blank");
                }

                alert(message);
            })
            .catch(function (error) {
                console.error("Error:", error);
            });
    } else {
        alert("No plants found.");
    }
}

function pageExists(pageUrl) {
    var apiUrl = "https://en.wikipedia.org/w/api.php?action=query&titles=" + encodeURIComponent(pageUrl) + "&format=json&origin=*";

    return fetch(apiUrl)
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            var pages = data.query.pages;
            var pageId = Object.keys(pages)[0];
            return pageId !== "-1";
        })
        .catch(function (error) {
            console.error("Error:", error);
            return false;
        });
}

function calculateRelevance(speciesName, searchTerm) {

    var relevance = 0;

    if (speciesName.toLowerCase().includes(searchTerm)) {
        relevance += 3; 
    }

    return relevance;
}

function displaySearchResults(results) {
    var searchContainer = document.createElement("div");
    searchContainer.className = "search-results-container";
    dataContainer.appendChild(searchContainer);

    if (results.length > 0) {
        var currentFamily, currentGenus;

        for (var j = 0; j < results.length; j++) {
            var searchResult = results[j];

            if (currentFamily !== searchResult.family) {
                currentFamily = searchResult.family;
                var familyHeader = createFamilyElement(currentFamily);
                searchContainer.appendChild(familyHeader);
            }

            if (currentGenus !== searchResult.genus) {
                currentGenus = searchResult.genus;
                var genusHeader = createGenusElement(currentGenus);
                searchContainer.appendChild(genusHeader);
            }

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

        dataContainer.innerHTML = "";
        currentPage = 1;
        searchResults = [];
        appendData();
    } else {

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

        if (speciesCount >= endIndex) {
            loadingMsg.style.display = "none";
            return;
        }
    }

    if (speciesCount <= endIndex) {
        window.removeEventListener("scroll", handleScroll);
    } else {
        loadingMsg.style.display = "none";
    }
}

searchButton.addEventListener("click", searchHandler);
searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        searchHandler();
    }
});

function loadData() {
    fetchData(function () {
        appendData();
        window.addEventListener("scroll", handleScroll);
    });
}

loadData();
