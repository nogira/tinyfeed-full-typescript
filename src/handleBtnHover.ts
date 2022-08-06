import { BaseSyntheticEvent } from 'react'

export function handleBtnHover(e: BaseSyntheticEvent, color: string | null) {
  // only modify appearance if current item is not selected
  if (! e.target.classList.contains("selected")) {
    e.target.style.backgroundColor = color;
  }
}