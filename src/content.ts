// pobranie elementu select
const combo = document.querySelector<HTMLSelectElement>("#combo");
const field = document.querySelector<HTMLSelectElement>("#text");

if (combo) {
    // odczyt początkowej wartości
    console.log("Aktualna wartość:", combo.value);

    // nasłuch zmian
    combo.addEventListener("change", () => {
        console.log("Zmieniono na:", combo.value);

        console.log(field?.value);

        if (field) {
            field.value = combo.value;
        }

        // opcjonalnie wyślij do background
        chrome.runtime.sendMessage({ type: "comboValue", value: combo.value }, (response) => {
            console.log("Odpowiedź z background:", response);
        });
    });
}