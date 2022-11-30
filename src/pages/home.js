import {
  Flex,
  Heading,
  Link,
  SearchField,
  View
} from "@aws-amplify/ui-react";
import React, { useEffect, useState, useContext } from "react";
import { API, Auth } from "aws-amplify";
import { listMedia } from "../graphql/queries";
import {
  createMedia as createMediaMutation,
  deleteMedia as deleteMediaMutation
} from "../graphql/mutations";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faX } from "@fortawesome/free-solid-svg-icons";



export default Home;