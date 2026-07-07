async function run() {
    const res = await fetch("https://script.google.com/macros/s/AKfycbxCQlUS3NNQTRxqGfpZsliDTAO3oRL6u7sKQJx-OjA5a-8w-FFn9afqpjkWkElx5dQ/exec?action=init");
    const text = await res.text();
    console.log(text.substring(0, 1000));
}
run();
