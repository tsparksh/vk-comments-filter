const VK_BOT_LIST_URL = 'https://hidder.s2w2.ru/marking3/list/'

const LOCAL_STORAGE_LIST_NAME = 'vk_bot_list'
const LOCAL_STORAGE_LIST_UPDATED_AT_NAME = 'vk_bot_list_updated_at'

const HIDDEN_COMMENT_TEXT = 'КОНТЕНТ УДАЛЕН VKHIDDER'

const SHOW_COMMENT_TEXT = '  - Показать'

const HIDDEN_BOT_REASON = 'БОТ - ГОСВОНЬ'
const HIDDEN_TEXT_REASON = 'КЛЮЧЕВЫЕ СЛОВА'
const HIDDEN_IMAGE_REASON = 'НЕКОРРЕКТНЫЙ АВАТАР'

async function fetchBotList() {
    response = await fetch(VK_BOT_LIST_URL)
    return await response.json()
}

async function updateBotList() {
	return fetchBotList().then(items => {
		itemsString = JSON.stringify(parseFetchedBotList(items))

		localStorage.setItem(LOCAL_STORAGE_LIST_NAME, itemsString)
		localStorage.setItem(LOCAL_STORAGE_LIST_UPDATED_AT_NAME, Date.now())

		return itemsString
	})
}

function parseFetchedBotList(items) {
	let output = []

	for (index in items) {
	    output.push(items[index].i)
	}

	return output
}

async function getBotList() {
	listUpdatedAt = new Date(Number(localStorage.getItem(LOCAL_STORAGE_LIST_UPDATED_AT_NAME) ?? 0))
	compareDate = new Date().getTime() - (1 * 24 * 60 * 60 * 1000) // update every day

	if (compareDate > listUpdatedAt) {
		items = await updateBotList()
	} else {
		items = localStorage.getItem(LOCAL_STORAGE_LIST_NAME) ?? await updateBotList()
	}

	return JSON.parse(items)
}

async function getVKCommentsList(element) {
	return element.getElementsByClassName('reply')
}

async function checkIsAuthorIdValid(id) {
	return getBotList().then(items => {
		return !items.includes(String(id))
	})
}

function checkIsTextValid(text, keywords = []) {
	tokens = Az.Tokens(text).done(['WORD'], false)

	for (var tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
	    let morph = Az.Morph(tokens[tokenIndex].toString())[0]
		let forms = []

		if(morph && morph.formCnt) {		
			for (var formIdx = 0; formIdx < morph.formCnt; formIdx++) {
			    let form = morph.inflect(formIdx);
			    forms.push(form.word)
			}
		}

		if (forms.filter(element => keywords.includes(element)).length > 0) return false
	}

	return true
}

function checkIsImageValid(url) {
	return true
}

function checkCommentIsAlreadyFiltered(comment) {
	return comment.classList.contains('comment-hidden')
}

function checkCommentIsAlreadyViewed(comment) {
	return comment.classList.contains('comment-viewed')
}

function setReason(comment, reason) {
	textBlock = document.createElement("p");

	comment.getElementsByClassName('reply_text')[0].insertAdjacentHTML('beforeBegin', 
		"<p style='font-family: monospace;'>" + 
			HIDDEN_COMMENT_TEXT + " (" + reason + ")" + 
			"<a id='show-comment-" + comment.id + "'>" + SHOW_COMMENT_TEXT + "</a>" + 
		"</p>"
	);

	document.getElementById('show-comment-' + comment.id).addEventListener('click', function() {
		showComment(comment)
		this.style.display = "none";
	})
}

function hideComment(comment) {
	comment.getElementsByClassName('reply_text')[0].style.display = "none";
	comment.classList.add('comment-hidden')
}

function showComment(comment) {
	comment.getElementsByClassName('reply_text')[0].style.display = "block";
}

async function filterCommentsList() {
	let comments = await getVKCommentsList(document)
	let config = await chrome.storage.sync.get()

	Array.from(comments).forEach(comment => {
		try {
			if (!checkCommentIsAlreadyFiltered(comment) && !checkCommentIsAlreadyViewed(comment)) filterComment(comment, config)
		} catch(err) {
			console.error(err)
		}
	})
}

async function filterComment(comment, config) {
	let [isValid, reason] = [true, '']

	if (!checkIsTextValid(
		comment.getElementsByClassName('reply_text')[0].textContent, config.keywords
	)) [isValid, reason] = [false, HIDDEN_TEXT_REASON]

	if (config.isBotsFilterEnabled) {
		let isAuthorIdValid = await checkIsAuthorIdValid(comment.getElementsByClassName('reply_author')[0].getElementsByTagName('a')[0].getAttribute('data-from-id'))
		if (!isAuthorIdValid) [isValid, reason] = [false, HIDDEN_BOT_REASON]
	}

	if (!checkIsImageValid(
		comment.getElementsByClassName('reply_image')[0].getElementsByTagName('img')[0].getAttribute('src')
	)) [isValid, reason] = [false, HIDDEN_IMAGE_REASON]

	if (!isValid) {
		hideComment(comment)
		setReason(comment, reason)
	}

	comment.classList.add('comment-viewed')
}

function startCommentsFiltering() {
	let filteringTimer = setInterval(() => filterCommentsList(), 3000);
}

Az.Morph.init(chrome.runtime.getURL('dicts'), startCommentsFiltering)