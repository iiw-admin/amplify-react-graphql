import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { API } from "aws-amplify";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons'
import {
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  View,
  Badge,
  SearchField,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { listMedia } from "./graphql/queries";
import {
  createMedia as createMediaMutation,
  deleteMedia as deleteMediaMutation,
} from "./graphql/mutations";

const App = ({ signOut }) => {
  const [titles, setTitles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTitles();
  }, []);

  async function fetchTitles() {
    const apiData = await API.graphql({ query: listMedia });
    const notesFromAPI = apiData.data.listMedia.items;
    setTitles(notesFromAPI);
  }

  async function createMedia(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const data = {
      title: form.get("title"),
      // description: form.get("description"),
    };
    await API.graphql({
      query: createMediaMutation,
      variables: { input: data },
    });
    fetchTitles();
    event.target.reset();
  }

  async function deleteMedia({ id }) {
    const newNotes = titles.filter((note) => note.id !== id);
    setTitles(newNotes);
    await API.graphql({
      query: deleteMediaMutation,
      variables: { input: { id } },
    });
  }

  const searchFilter = ( title ) => {
    if( !searchTerm ) {
      return true;
    }
    return title.title.toLowerCase().includes( searchTerm );
  }

  return (
      <View className="App">
        <Flex className="" direction="row-reverse" wrap="nowrap" alignItems="right">
          <View>
            <Badge size={"large"}><FontAwesomeIcon icon={faUser} /></Badge>
          </View>
        </Flex>
        <Flex className="" direction="column" alignItems="center" justifyContent="center">
          <Heading level={1}>Title</Heading>
          <SearchField
              label="Search"
              placeholder="Search"
              hasSearchButton={false}
              hasSearchIcon={true}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Flex>
        <Flex id="searchResults" justifyContent={"center"} direction={"column"}>
          {titles.filter(searchFilter).map((title) => {
            return (
                <View key={title.id} className={"searchResult"}>{title.title}</View>
            )
          })}
        </Flex>
        <View as="form" margin="3rem 0" onSubmit={createMedia}>
          <TextField
              name="title"
              placeholder="Entry Title"
              label="Entry Title"
              labelHidden
              variation="quiet"
              required
          />
          <Button type="submit" variation="primary">
            Add to Database
          </Button>
        </View>
      </View>
  );
};

export default withAuthenticator(App);
