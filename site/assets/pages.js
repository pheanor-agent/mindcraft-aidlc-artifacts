'use strict';
const search = document.getElementById('search');
if (search) {
  const documents = [...document.querySelectorAll('[data-document]')];
  search.addEventListener('input', () => {
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const item of documents) {
      item.hidden = !words.every(word => item.dataset.search.includes(word));
      if (!item.hidden) count++;
    }
    document.querySelectorAll('.group').forEach(group => {
      group.hidden = !group.querySelector('[data-document]:not([hidden])');
      if (words.length && !group.hidden) group.open = true;
    });
    document.getElementById('result-count').textContent = `${count}개 문서`;
    document.getElementById('empty').hidden = count !== 0;
  });
}
