import React from 'react'


function Link(props) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href={props.href}
      className={props.className}>
      {props.title}</a>
  )
}

export default Link