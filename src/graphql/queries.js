/* eslint-disable */
// this is an auto generated file. This will be overwritten


export const listMedia = /* GraphQL */ `
    query ListMedia(
        $filter: ModelMediaFilterInput
        $limit: Int
        $nextToken: String
    ) {
        listNotes(filter: $filter, limit: $limit, nextToken: $nextToken) {
            items {
                id
                name
            }
            nextToken
        }
    }
`;
