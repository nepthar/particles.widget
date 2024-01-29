# particles shell workspace file

export workspace="particles"

## Generate the zip file
particles.zip() {
  if [[ ! -z "$(git status -z)" ]]; then
    echo "Uncommitted changes. Don't zip like this"
    return 1
  fi

  local tmp="./particles.widget"
  local zip_contents=(
    ./src
    widget.json
    particles.coffee
    LICENSE
    README.md
  )

  rm particles.widget.zip
  mkdir "$tmp"

  for item in "${zip_contents[@]}"; do
    cp -r $item "${tmp}"
  done

  git show --no-patch > "${tmp}/commit.txt"
  zip -r particles.widget.zip ./particles.widget
  rm -rf "$tmp"
}

particles.link() {
  local widgets="${HOME}/Library/Application Support/Übersicht/widgets"

  if [[ ! -f './particles.coffee' ]]; then
    echo "Run this from the project root folder"
    return 1
  fi

  echo "./ -> $widgets"
  ln -s "$PWD" "$widgets"
}