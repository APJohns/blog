---
title: 'Animating popcorn kernels with the :has() selector'
description: 'Selecting previous siblings on hover using the :has() selector.'
pubDate: 'Apr 2 2025 EST'
tags: ['Frontend', 'Mini tips']
featured: true
---

![Screenshot of a 5-star rating component where the stars are popcorn kernels](@/images/popcorn1.png)

I was working on a star-rating component concept using popcorn for stars. I wanted to animate the kernels, up to the one
being hovered on. I wanted to keep this as a CSS solution, but this meant going back in the tree.

![Gif of the kernels where the mouse is hovering over the 3rd kernel and the first 3 kernels are jiggling](@/images/popcorn-jiggle.gif)

I want to select all the labels before the one that is being hovered. Here's the HTML structure I'm working with:

```
fieldset
  legend
  div
    label
      input
      kernel svg
    label
      input
      kernel svg
    (+ 3 more)

```

With the `:has()` selector now being baseline across browsers, this becomes possible with the following CSS:

```css
label:has(~ label:hover),
label:hover {
  transform-origin: center;
  animation: jiggle 0.1s linear infinite alternate;
}
```

For a quick refresher on how `:has()` works, it selects all elements that contain elements that match the provided selector.
It's really great for going up the tree and selecting parents e.g. selecting all `<div>`'s that contain a `<p>`.
But we can also use it to traverse the tree horizontally in reverse by combining it with the
[subsequent-sibling combinator](https://developer.mozilla.org/en-US/docs/Web/CSS/Subsequent-sibling_combinator) (~).

The first selector selects all labels that _have_ a later sibling label that is being hovered. This doesn't catch the actual element
being hovered, so we add in the second selector.

The `:has()` selector is super powerful, and I love finding new ways to use it!

You can check out the [demo for this component](https://codepen.io/AshJohns/pen/zxYyVjp) on my CodePen.
