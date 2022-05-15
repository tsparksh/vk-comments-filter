document.addEventListener("DOMContentLoaded", () => {
	chrome.storage.sync.get().then(config => {
		if (config.isBotsFilterEnabled ?? true) document.getElementById('isBotsFilterEnabled').checked = true
		if (config.keywords && config.keywords.constructor === Array) {
			document.getElementById('keywords').value = config.keywords.toString()
			console.log(config)
		}
	})

	document.getElementById('save-btn').addEventListener('click', () => {
		chrome.storage.sync.set({
			isBotsFilterEnabled: document.getElementById('isBotsFilterEnabled').checked,
			keywords: document.getElementById('keywords').value.split(' ').join('').split(",")
		})

		document.getElementById('save-btn').value = 'Сохранено'
	})
});