# particles shell workspace file

# Environment
export ws_name="particles" # Required
export ws_home="/Users/nepthar/Code/particles.widget" # Required

zip_contents=(
  ./src
  widget.json
  particles.coffee
  LICENSE
  README.md
)

cmd.zip() {
  if [[ ! -z "$(git status -z)" ]]; then
    echo "Uncommitted changes. Don't zip like this"
    return 1
  fi

  tmp="./particles.widget"

  rm particles.widget.zip
  mkdir "$tmp"

  for item in "${zip_contents[@]}"; do
    cp -r $item "${tmp}"
  done

  git show --no-patch > "${tmp}/commit.txt"
  zip -r particles.widget.zip ./particles.widget
  rm -rf "$tmp"
}