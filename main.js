const { createApp } = Vue;

createApp({
    data() {
        return {
            currentView: 'feed',
            searchQuery: '',
            posts: [],
            loading: false,
            after: null,
            subreddits: [
                'memes', 'aww', 'gaming', 'interestingasfuck', 'oddlysatisfying',
                'NatureIsFuckingLit', 'Art', 'FoodPorn', 'space', 'architecture'
            ]
        }
    },
    methods: {
        async fetchPosts() {
            if (this.loading) return;
            this.loading = true;

            const urlParams = new URLSearchParams(window.location.search);
            this.subreddit = urlParams.get('subreddit') || '';

            try {
                const randomSubreddit = this.subreddit || this.subreddits[Math.floor(Math.random() * this.subreddits.length)];
                const response = await fetch(
                    `https://www.reddit.com/r/${randomSubreddit}/hot.json?limit=5&after=${this.after || ''}`
                );

                const data = await response.json();
                this.after = data.data.after;

                const newPosts = data.data.children
                    // .filter(post => !post.data.over_18)
                    .map(post => this.parsePost(post.data));

                this.posts = [...this.posts, ...newPosts
                    .map(value => ({ value, sort: Math.random() }))
                    .sort((a, b) => a.sort - b.sort)
                    .map(({ value }) => value)];
            } catch (error) {
                console.error('Fetch error:', error);
            } finally {
                this.loading = false;
            }
        },

        goBack() {
            window.history.back();
        },

        parsePost(postData) {
            const media = this.getMedia(postData);
            return {
                id: postData.id,
                subreddit: postData.subreddit,
                author: postData.author,
                title: postData.title,
                description: postData.selftext,
                ups: postData.ups,
                loading: !!media,
                expanded: false,
                mediaType: media?.type,
                mediaUrl: media?.url
            };
        },

        getMedia(post) {
            if (post.post_hint === 'image') return { type: 'image', url: post.url };
            if (post.is_video) return { type: 'video', url: post.media.reddit_video.fallback_url };
            if (post.gallery_data) {
                const firstImage = post.media_metadata[post.gallery_data.items[0].media_id];
                return { type: 'image', url: firstImage.s.u.replace(/&amp;/g, '&') };
            }
            return null;
        },

        parseMarkdown(text) {
            if (!text) return '';
            const rawHtml = marked.parse(text);
            return DOMPurify.sanitize(rawHtml);
        },

        toggleVideoPlayback(post) {
            const video = this.$refs[`video-${post.id}`]?.[0];
            if (!video) return;
            video.paused ? video.play() : video.pause();
        },

        toggleDescription(post) {
            if (!post.mediaType) return;
            post.expanded = !post.expanded;
        },

        handleMediaError(post) {
            post.loading = false;
            post.mediaUrl = null;
        },

        handleScroll() {
            const scrollPosition = window.innerHeight + window.scrollY;
            const scrollThreshold = document.documentElement.offsetHeight - 300;
            if (scrollPosition >= scrollThreshold && !this.loading) {
                this.fetchPosts();
            }
        },

        performSearch() {
            const query = encodeURIComponent(this.searchQuery);
            window.location.href = window.location.pathname + `?subreddit=${query}`;
        },

        switchView(view) {
            this.currentView = view;
            if (view === 'feed') {
                this.fetchPosts();
            }
        }
    },
    mounted() {
        this.fetchPosts();
        document.getElementById("app").addEventListener('scroll', this.handleScroll);
    },
    beforeUnmount() {
        document.getElementById("app").removeEventListener('scroll', this.handleScroll);
    }
}).mount('#app');