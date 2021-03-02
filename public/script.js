let success = document.querySelector('#success');
let fail = document.querySelector('#fail');
function createUrl(e) {
    e.preventDefault();
    // e.stopPropagation();
    let url = document.getElementById('url');
    let slug = document.getElementById('slug');

    fetch('/url', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            url: url.value,
            slug: slug.value,
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            console.log(data);
            if (data.message) {
                fail.classList.remove('toggleDisplay');
                success.classList.add('toggleDisplay');
                fail.innerHTML = data.message;
            } else {
                fail.classList.add('toggleDisplay');
                success.classList.remove('toggleDisplay');
                let url = window.location.href + data.slug;
                success.innerHTML =
                    '<span class="h6">Link Created</span> - <a href="' +
                    url +
                    '" target="_blank"><pre>' +
                    url +
                    '</pre></a>';
            }
        })
        .catch((err) => console.log(err));
}

document.querySelector('form').addEventListener('submit', (e) => createUrl(e));
