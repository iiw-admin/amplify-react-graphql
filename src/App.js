import React, {
  useState,
  useEffect
} from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { API, Storage } from 'aws-amplify';
import {
  Flex,
  Heading,
  View,
  Badge,
  Autocomplete,
  Divider,
  Link,
  SearchField,
  withAuthenticator, Button, TextField,
} from '@aws-amplify/ui-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons'
import {
  createMedia as createMediaMutation,
} from "./graphql/mutations";
import { listMedia } from "./graphql/queries";

const App = ({ signOut }) => {

  useEffect(() => {
    // Do nothing... yet...
  }, []);

  async function createDBEntry(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const data = {
      id: Math.floor( Math.random() * 1000000 ),
      name: form.get("name"),
    };
    console.log( "Data", data );
    console.log( "createMediaMutation", createMediaMutation );
    await API.graphql({
      query: createMediaMutation,
      variables: { input: data },
    });
    fetchMedia();
    event.target.reset();
  }


  async function fetchMedia() {
    const apiData = await API.graphql({ query: listMedia });
    const mediaFromAPI = apiData.data.listMedia.items;
    await Promise.all(
        mediaFromAPI.map(async (note) => {
          return note;
        })
    );
    setSearchResults(mediaFromAPI);
  }

  const [ searchTerm, setSearchTerm ] = useState('');
  const [ searchResults, setSearchResults ] = useState([
    { id: "1", label: "Option aaa" },
    { id: "2", label: "Option aab" },
    { id: "3", label: "Option aac" },
    { id: "4", label: "Option aba" },
    { id: "5", label: "Option abc" },
    { id: "6", label: "Option bbc" },
    { id: "7", label: "Option bab" },
    { id: "8", label: "Option bcc" },
    { id: "9", label: "Option ccc" },
    { id: "10", label: "Option ada" },
    { id: "11", label: "Option eee" },
    { id: "12", label: "Option abdb" },
  ]);

  const searchFilter = (element) => {
    return element.label.indexOf( searchTerm ) > -1;
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
          {searchResults.filter(searchFilter).map((result) => {
            return (
                <View key={result.id} className={"searchResult"}>{result.label}</View>
            )
          })}
        </Flex>
        <View as="form" margin="3rem 0" onSubmit={createDBEntry}>
          <TextField
              name="name"
              placeholder="Entry Name"
              label="Entry Name"
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
