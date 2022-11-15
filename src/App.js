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
} from "./graphql/mutations";
import { darkTheme } from "./themes/darkTheme";
import { lightTheme } from "./themes/lightTheme";
Amplify.configure(config);

let searchTimeout = null;

const App = () => {
  /*
   * Enums
   */
  const MENU_MODES = {
    LOGIN: 1,
    CONFIRM_ACCOUNT: 2,
    RESET_PASSWORD: 3,
    AUTHENTICATED: 4,
  }

  /*
   * Search
   */
  const [titles, setTitles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResultsComponent, setSearchResultsComponent] = useState(<></>);

  /*
   * Account and Login
   */
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [loggedInUserEmail, setLoggedInUserEmail] = useState("");
  const [isAccountConfirmed, setIsAccountConfirmed] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [menuMode, setMenuMode] = useState( MENU_MODES.LOGIN );

  /*
   * Page control
   */
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    onAppLoad();
  }, []);

  useEffect(() => {
    checkVerificationCode();
  }, [verificationCode]);

  useEffect(() => {
    if( searchTimeout ) {
      clearTimeout( searchTimeout );
    }
    searchTimeout = setTimeout(() => {
      if( searchTerm ) {
        fetchTitles()
            .then(() => {
              console.log("Done fetching titles");
            })
      }
    }, 300);
  }, [searchTerm]);

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
      setMenuMode( MENU_MODES.CONFIRM_ACCOUNT );
    } catch (error) {
      console.log('error signing up:', error);
      /* Possible errors:
       * UsernameExistsException: An account with the given email already exists.
       * InvalidPasswordException: Password did not conform with policy: Password not long enough
       * UserNotConfirmedException: User is not confirmed.
       */
      switch( error.name ) {
        case "UsernameExistsException":
          setLoginError("That email is already in use.");
          break;
        default:
          break;
      }
    }
  }

  async function signIn() {
    try {
      const user = await Auth.signIn(username, password);
      setIsUserLoggedIn(true);
      setLoggedInUserEmail( user.attributes.email );
      setMenuMode( MENU_MODES.AUTHENTICATED );
      setUsername("");
      setPassword("");
      console.log("🎉 Logged in!");
    } catch (error) {
      console.log( "e", JSON.stringify( error ), error.toString() );
      switch( error.name ) {
        case "NotAuthorizedException":
          if( error.toString().indexOf( "User is disabled" ) > -1 ) {
            setLoginError("Account disabled.");
          } else {
            setLoginError("Incorrect username or password.");
          }
          break;
        case "UserNotFoundException":
          setLoginError("Incorrect username or password.");
          break;
        case "UserNotConfirmedException":
          setMenuMode( MENU_MODES.CONFIRM_ACCOUNT );
          setLoggedInUserEmail( username );
          setIsAccountConfirmed(false);
          resendConfirmationCode();
          console.log("⚙️ Sending Confirmation Code");
          break;
        default:
          break;
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
      setMenuMode( MENU_MODES.LOGIN );
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
      setMenuMode( MENU_MODES.AUTHENTICATED );
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
      console.log(`Checking Verification Code ${verificationCode}`);
      try {
        await Auth.confirmSignUp(loggedInUserEmail, verificationCode);
        setIsAccountConfirmed(true);
        setIsUserLoggedIn(true);
        setMenuMode( MENU_MODES.AUTHENTICATED );
      } catch (error) {
        console.log('error confirming sign up', error);
      }
    }
  }

  async function fetchTitles() {
    const apiData = await API.graphql({ query: listMedia });
    const itemsFromAPI = apiData.data.listMedia.items;
    setTitles(itemsFromAPI);

    console.log("📡 API Data", apiData);

    const searchResults = (
        <Flex id="searchResults" justifyContent={"center"} direction={"column"}>
          {itemsFromAPI.filter(searchFilter).map((title) => {
            return (
                <View key={title.id} className={"searchResult"}>{title.title}</View>
            )
          })}
        </Flex>
    )

    setSearchResultsComponent( searchResults );
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

  const searchFilter = ( title ) => {
    if( !searchTerm ) {
      return false;
    }
    return title.title.toLowerCase().includes( searchTerm.toLowerCase() );
  }

  const SearchResults = () => {
    return (
        !searchTerm
            ? null
            : searchResultsComponent
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
                    {
                      {
                        [MENU_MODES.LOGIN]: (
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
                              <Text>{loginError}</Text>
                              <Button onClick={signIn}>Sign In</Button>
                              <Button onClick={signUp}>Create Account</Button>
                              <Text>Forgot Password</Text>
                            </>
                        ),
                        [MENU_MODES.CONFIRM_ACCOUNT]: (
                            <View>
                              <Text>A confirmation code has been sent to {username}. Enter it below to confirm your account and log in.</Text>
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
                        ),
                        [MENU_MODES.RESET_PASSWORD]: (<></>),
                        [MENU_MODES.AUTHENTICATED]: (
                            <>
                              <>{loggedInUserEmail}</>
                              <Link href={"/account"}>Manage Account</Link>
                              <Button onClick={signOut}>Sign Out</Button>
                            </>
                        ),
                      }[menuMode]
                    }
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
