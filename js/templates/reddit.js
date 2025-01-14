/* Hover classes bound themselves to a node
 * The reddit class is directly depending from /utils/reddit-comment-embed which is the embedding library needed for the support
 * of dynamically added content.
 */
class RedditHover {
    constructor(node, CURRENT_TAB) {
        this.boundNode = node;
        this.redirectLink = node.href;
        this.CURRENT_TAB = CURRENT_TAB;
        this.linkType = this.checkLinkType();
    }

    /* Description: This function is unique to every Hover class,
     * its goal is to determine which type of embed should be chosen for the link.
     * it can also delete the whole class if there is no point in having an embed.
     */
    checkLinkType() {
        /* As comments are the only thing implemented for now let's ignore the rest
         * TODO : 
         * - Implement users when on other sites
         * - Implement discussions (couldn't get discussion embed code from reddit when I tried (bug?))
         * - Improve link detection for comments
         */

        /* Due to lags because of the number of self referencing links on reddit */
        if ((this.CURRENT_TAB == 'reddit.com' && this.boundNode.classList.length == 0 && !this.boundNode.href.includes('#')) || this.CURRENT_TAB != 'reddit.com') {

            /* Split by '/', but remove final empty string */
            const urlChunks = this.redirectLink.replace('https://', '').split('/').filter(e => e !== '');
            /* Comments have a 7-character unique ID, which is the last slash enclosed path part */
            if (urlChunks.length == 7 && /[a-z0-9]{7}/.test(urlChunks[6])) {
                return 'comment';
            } else if (urlChunks.length == 6 && /\/comments\/[^\/]+\/[^\/]+\/[^\/]*$/.test(this.redirectLink)) {
                return 'post';
            } else {
                return 'unknown';
            }

        } else {
            return 'unknown';
        }
    }

    bindToNode() {
        if (this.linkType == 'comment') {
            /* Building node using js functions is required by Firefox to get the permission to publish the extension officialy
             * (At least I had to do it the last time I did one).
             * Also the commentContainer is needed as rembeddit overwrites the comment to an iframe and the iframe is not affected by class change.
             */

            let commentContainer = document.createElement('div');
            commentContainer.className = 'survol-tooltiptext';

            /* This is a reconstitution of the reddit embed code when sharing a comment.*/
            let comment = document.createElement('div');
            comment.setAttribute('data-embed-media', 'www.redditmedia.com');
            comment.setAttribute('data-embed-parent', 'false');
            comment.setAttribute('data-embed-live', 'false');
            comment.setAttribute('data-embed-created', `${new Date().toISOString()}`);
            comment.className = 'reddit-embed';

            let commentDirectLink = document.createElement('a');
            commentDirectLink.href = `${this.redirectLink}?`;
            commentDirectLink.appendChild(document.createTextNode('Comment'));

            let discussionDirectLink = document.createElement('a');
            discussionDirectLink.href = `${this.redirectLink.split('/').slice(0, this.redirectLink.split('/').length - 1).join('/')}?`;
            discussionDirectLink.appendChild(document.createTextNode('discussion'));

            comment.appendChild(commentDirectLink);
            comment.appendChild(document.createTextNode('from discussion'));
            comment.appendChild(discussionDirectLink);

            commentContainer.appendChild(comment);
            this.boundNode.appendChild(commentContainer);

            /* Because for some reason embed code doesn't init itself directly when added dynamically, depends directly of reddit-comment-embed.js */
            window.rembeddit.init();

            this.boundNode.classList.add('survol-tooltip');
        } else if (this.linkType === 'post') {
            /* We need the specific post ID to get JSON */
            /* Post ID should be 6 character alpha-numeric (base36) */
            const postId = /\/r\/[^\/]+\/comments\/([a-z0-9]{6,})\//.exec(this.redirectLink)[1];

            window
                .survolBackgroundRequest(`https://api.reddit.com/api/info/?id=t3_${postId}`)
                .then((res) => {
                    const generatedEmbed = RedditHover.redditJsonToHoverElem(res.data);
                    let postContainer = document.createElement('div');
                    postContainer.className = 'survol-tooltiptext survol-tooltiptext-reddit-post';
                    postContainer.appendChild(generatedEmbed);
                    this.boundNode.appendChild(postContainer);
                    this.boundNode.classList.add('survol-tooltip');
                })
                .catch((error) => {
                    console.error('SURVOL - Background request failed', error);
                });
        }
    }

    /* Parse Reddit API JSON and construct preview embed */
    static redditJsonToHoverElem(redditJson) {
        let postData = redditJson.data.children[0].data;
        console.log(postData);
        let container = document.createElement('div');
        container.classList.add('survol-reddit-container');

        let title = document.createElement('b');
        title.className = 'survol-reddit-post-title';
        title.appendChild(document.createTextNode(postData.title));

        let image = document.createElement('img');
        image.classList.add('survol-reddit-image');
        image.setAttribute('src', postData.thumbnail);

        let divider = document.createElement('div');
        divider.className = 'survol-divider';

        let footer = document.createElement('div');
        footer.className = 'survol-reddit-footer';

        let postDetails = document.createElement('span');
        postDetails.className = 'survol-reddit-post-details';

        let subredditLink = document.createElement('a');
        //subredditLink.setAttribute('href', `https://www.reddit.com/r/${postData.subreddit}`);
        subredditLink.appendChild(document.createTextNode(` on /${postData.subreddit_name_prefixed}`));

        let redditLogo = document.createElement('img');
        redditLogo.src = '../images/reddit.png';
        redditLogo.className = 'survol-reddit-logo';

        let author = document.createElement('span');
        author.className = 'survol-reddit-author';
        author.appendChild(document.createTextNode(`Posted by u/${postData.author}`));

        let score = document.createElement('div');
        //score.className = 'survol-reddit-post-details';
        score.appendChild(document.createTextNode(`${postData.score} points`));

        let commentCount = document.createElement('div');
        //commentCount.className = 'survol-reddit-post-details';
        commentCount.appendChild(document.createTextNode(`${postData.num_comments} comments`));

        let br = document.createElement('br');
        //  const postLink = `https://www.reddit.com/${postData.permalink}`;



        // if thumbnail append thumnail
        if (postData.thumbnail != 'self') {
            container.appendChild(image);
        }

        // else append post content
        else {
            let text = document.createElement('p');
            text.className = 'survol-reddit-selftext';
            text.appendChild(document.createTextNode(postData.selftext));
            container.appendChild(text);
        }

        container.appendChild(divider);

        footer.appendChild(redditLogo);
        footer.appendChild(title);

        postDetails.appendChild(author);
        postDetails.appendChild(subredditLink);
        postDetails.appendChild(score);
        postDetails.appendChild(commentCount);

        footer.appendChild(postDetails);
        container.appendChild(footer);

        return container;
    }
}
