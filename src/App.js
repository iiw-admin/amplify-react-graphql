import { Amplify, API, Auth } from "aws-amplify";
import config from './aws-exports';
import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import "./Styles.css";
import "@aws-amplify/ui-react/styles.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import {
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  View,
  Badge,
  SearchField,
  Link,
  PasswordField,
  ThemeProvider
} from "@aws-amplify/ui-react";
import { listMedia } from "./graphql/queries";
import {
  createMedia as createMediaMutation,
  deleteMedia as deleteMediaMutation,
} from "./graphql/mutations";
import { darkTheme, lightTheme } from "./themes";
Amplify.configure(config);

const App = () => {
  /*
   * Search
   */
  const [titles, setTitles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  /*
   * Account and Login
   */
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [loggedInUserEmail, setLoggedInUserEmail] = useState("");
  const [isAccountConfirmed, setIsAccountConfirmed] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  /*
   * Page control
   */
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showMenu, setShowMenu] = useState(true);
  const [loginError, setLoginError] = useState("Problem something error happens. Please try again.");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // fetchTitles();
    onAppLoad();
  }, []);

  useEffect(() => {
    checkVerificationCode();
  }, [verificationCode]);

  const menuReference = useRef(null)

  const closeOpenMenus = (e)=> {
    if( menuReference.current && showMenu && !menuReference.current.contains( e.target ) ) {
      setShowMenu( false )
    }
  }

  document.addEventListener('mousedown',closeOpenMenus)

  async function signUp() {
    try {
      const { user } = await Auth.signUp({
        username,
        password,
        autoSignIn: { // optional - enables auto sign in after user is confirmed
          enabled: true,
        }
      });
      setIsAccountConfirmed(false);
      setLoggedInUserEmail( user.username );
      setIsUserLoggedIn( true );
    } catch (error) {
      console.log('error signing up:', error);
      /* Possible errors:
       * UsernameExistsException: An account with the given email already exists.
       * InvalidPasswordException: Password did not conform with policy: Password not long enough
       * UserNotConfirmedException: User is not confirmed.
       */
    }
  }

  async function signIn() {
    try {
      const user = await Auth.signIn(username, password);
      setIsUserLoggedIn(true);
      setIsAccountConfirmed(user.attributes.email_verified);
      setLoggedInUserEmail( user.attributes.email );
      setUsername("");
      setPassword("");
      console.log("🎉 Logged in!");
    } catch (error) {
      if( error.name === "UserNotConfirmedException" ) {
        setLoggedInUserEmail( username );
        setIsAccountConfirmed(false);
        setIsUserLoggedIn( true );
        resendConfirmationCode();
        console.log("⚙️ Sending Confirmation Code");
      }
      console.log('😢 Error signing in', error);
    }
  }

  async function signOut() {
    try {
      await Auth.signOut();
      setIsAccountConfirmed( false );
      setLoggedInUserEmail( null );
      setIsUserLoggedIn( false );
      console.log('👋🏼 Signed out. Bye!');
    } catch (error) {
      console.log('💫 Error signing out: ', error);
    }
  }

  async function onAppLoad() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      setIsAccountConfirmed( user.attributes.email_verified );
      setLoggedInUserEmail( user.attributes.email );
      setIsUserLoggedIn(true);
      console.log('👍 Already signed in!');
    } catch {
      // Do nothing
    }
  }

  async function resendConfirmationCode() {
    try {
      await Auth.resendSignUp(username);
    } catch (err) {
      // TODO ????
    }
  }

  const checkVerificationCode = async () => {
    if (verificationCode.length === 6) {
      try {
        await Auth.confirmSignUp(loggedInUserEmail, verificationCode);
        setIsAccountConfirmed(true);
        setIsUserLoggedIn(true);
      } catch (error) {
        console.log('error confirming sign up', error);
      }
    }
  }

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
    return title.title.toLowerCase().includes( searchTerm.toLowerCase() );
  }

  const SearchResults = () => {
    return (
        <Flex id="searchResults" justifyContent={"center"} direction={"column"}>
          {titles.filter(searchFilter).map((title) => {
            return (
                <View key={title.id} className={"searchResult"}>{title.title}</View>
            )
          })}
        </Flex>
    )
  };

  return (
      <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <View className="App" id={"app-main"}>
          <Flex id="navigation" direction="column" wrap="nowrap" alignItems="flex-end">
            <View id={"userBadge"}>
              <Badge size={"large"} onClick={() => setShowMenu(!showMenu)}>
                <FontAwesomeIcon icon={faUser} />
              </Badge>
            </View>
            <View id={"darkModeToggle"}>
              <Badge size={"large"} onClick={() => { setDarkMode( !darkMode )}}>
                <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
              </Badge>
            </View>
            { showMenu ? (
                <View id={"menu"} ref={menuReference} key={"userPopoutMenu"}>
                  <Flex direction={"column"} alignItems={"left"}>
                    { loggedInUserEmail
                        ? ( <>{loggedInUserEmail}</> )
                        : null
                    }
                    { isUserLoggedIn
                        ? (
                            <>
                            { !isAccountConfirmed
                                ? (
                                  <>
                                    <View>
                                      <Text>A confirmation code has been sent to the email above. Enter it below to confirm your account and log in.</Text>
                                      <TextField
                                          name="verification_code"
                                          placeholder="Verification Code"
                                          label="Verification Code"
                                          labelHidden
                                          variation="quiet"
                                          required
                                          value={verificationCode}
                                          onChange={(event) => setVerificationCode(event.target.value)}
                                      />
                                    </View>
                                  </>
                                )
                                : <Link href={"/account"}>Manage Account</Link>
                            }
                            </>
                        )
                        : (
                            <>
                              <TextField
                                  name="login_username"
                                  key={"login_username"}
                                  placeholder="Email"
                                  label="Your Email Address"
                                  labelHidden
                                  variation="quiet"
                                  required
                                  value={username}
                                  onChange={(event) => { event.preventDefault(); setUsername(event.target.value); }}
                              />
                              <PasswordField
                                  name="login_password"
                                  key={"login_password"}
                                  placeholder="Password"
                                  label="Your Password"
                                  labelHidden
                                  variation="quiet"
                                  required
                                  value={password}
                                  onChange={(event) => { event.preventDefault(); setPassword(event.target.value); }}
                              />
                              <Text className="error" >{loginError}</Text>
                              <Button onClick={signIn}>Sign In</Button>
                              <Button onClick={signUp}>Create Account</Button>
                            </>
                        )
                    }
                    { isUserLoggedIn ? (
                      <Button onClick={signOut}>Sign Out</Button>
                    ) : null }
                  </Flex>
                </View>
            ) : null }
          </Flex>
          <Flex id="content" direction="column" alignItems="center" justifyContent="center">
            <Heading level={1}>Title</Heading>
            <SearchField
                label="Search"
                placeholder="Search"
                hasSearchButton={false}
                hasSearchIcon={true}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Flex>
          <SearchResults />
          <View as="form" margin="3rem 0" onSubmit={createMedia}>
            <TextField
                name="title"
                placeholder="Add a new title"
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
      </ThemeProvider>
  );
};

export default App;
