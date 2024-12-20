<script>
  import { formatDate } from '@/utils';

  let { posts } = $props();
  const allTags = posts
    .reduce((acc, post) => {
      post.data.tags &&
        post.data.tags.forEach((tag) => {
          if (!acc.includes(tag)) {
            acc.push(tag);
          }
        });
      return acc;
    }, [])
    .toSorted();

  const filterPosts = (posts, tags) => {
    if (Object.values(tags).every((t) => !t)) {
      return posts;
    } else {
      return posts.filter((p) =>
        Object.keys(tags)
          .map((t) => tags[t] && p.data.tags.includes(t))
          .includes(true)
      );
    }
  };

  let tags = $state({});
  let filteredPosts = $derived(filterPosts(posts, tags));
</script>

<fieldset class="tag-list tags">
  <legend>Filter by tags</legend>
  {#each allTags as tag}
    <label>
      <input type="checkbox" class="tag-checkbox visually-hidden" bind:checked={tags[tag]} />
      <span class="tag">{tag}</span>
    </label>
  {/each}
</fieldset>

<ul class="post-list">
  {#each filteredPosts as post}
    <li class="post-item">
      <a href={`/blog/${post.id}/`} class="post-link">
        <div class="details">
          <p class="date">
            {formatDate(post.data.pubDate)}
          </p>
          <h2 class="title">{post.data.title}</h2>
          <p class="description">{post.data.description}</p>
          <ul class="tags">
            {#each post.data.tags as tag}
              <li class="tag">{tag}</li>
            {/each}
          </ul>
        </div>
      </a>
    </li>
  {/each}
</ul>

<style>
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0;
    list-style: none;
  }

  .tag {
    background: rgb(var(--gray-light));
    padding: 0.125rem 0.5rem;
    font-size: 1rem;
    cursor: pointer;
  }

  .tag-list {
    margin-top: 4rem;
    border: 0;
  }

  .tag-checkbox:checked + .tag {
    color: var(--surface);
    background: var(--accent);
  }

  .post-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem;
    margin-top: 4rem;
    padding: 0;
    list-style: none;
  }

  .post-item {
    display: flex;
  }

  .post-item:first-of-type {
    grid-column: 1/-1;
  }

  .post-link {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 1rem;
    border: 1px solid #ddd;
    padding: 1.5rem;
    color: black;
    text-decoration: none;
  }

  .post-link:hover {
    background: #eee;
  }

  .title {
    font-size: 1.5rem;
    margin-bottom: 0;
  }

  .details {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .date {
    margin-top: 0;
    color: var(--body-subtle);
    font-size: 1rem;
  }

  .description {
    margin-top: 1rem;
  }
</style>
