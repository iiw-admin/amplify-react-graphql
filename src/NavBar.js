import React, { useEffect, useRef, useState, useContext } from 'react'
import {
  Badge, Button, Card,
  Flex, Link,
  PasswordField, Text,
  TextField, ToggleButton, ToggleButtonGroup,
  View
} from "@aws-amplify/ui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun, faUser } from "@fortawesome/free-solid-svg-icons";
import { MENU_MODES } from "./enums";
import { Auth } from "aws-amplify";


export default NavBar
