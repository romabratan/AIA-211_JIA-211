# /downloads

Place pre-zipped archives here. Expected filenames (already wired up in the UI):

```
downloads/all-photos.zip
downloads/mania.zip
downloads/free.zip
downloads/girls.zip
downloads/boys.zip
downloads/all.zip
downloads/group.zip
downloads/people/<person-id>.zip   (person-id = slugified folder name, see data/photos.json -> people[].id)
```

The download buttons check whether each file exists (HTTP HEAD) before
downloading, so archives can be added incrementally without breaking anything.
