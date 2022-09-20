import type { NextPage } from "next"
import { useRouter } from "next/router"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import MainLayout from "../components/MainLayout"
import {
  Container,
  Heading,
  VStack,
  Text,
  Image,
  Button,
  HStack,
} from "@chakra-ui/react"
import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { ArrowForwardIcon } from "@chakra-ui/icons"
import { PublicKey, Transaction } from "@solana/web3.js"
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js"
import {
  createInitializeStakeAccountInstruction,
  createStakeInstruction,
} from "../utils/instructions"

const NewMint: NextPage<NewMintProps> = ({ mint }) => {
  const [nftData, setNftData] = useState<any>()
  const { connection } = useConnection()
  const walletAdapter = useWallet()
  const { publicKey, sendTransaction } = useWallet()
  const metaplex = useMemo(() => {
    return Metaplex.make(connection).use(walletAdapterIdentity(walletAdapter))
  }, [connection, walletAdapter])
  const router = useRouter()

  useEffect(() => {
    metaplex
      .nfts()
      .findByMint({ mintAddress: mint })
      .run()
      .then((nft) => {
        setNftData(nft)
      })
  }, [mint, metaplex, walletAdapter])

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      if (publicKey) {
        const tokenAccount = (await connection.getTokenLargestAccounts(mint))
          .value[0].address

        const initializeStakeAccountInstruction =
          createInitializeStakeAccountInstruction(publicKey, tokenAccount)

        const stakeInstruction = createStakeInstruction(
          publicKey,
          tokenAccount,
          nftData.mint.address,
          nftData.edition.address
        )

        const transaction = new Transaction().add(
          initializeStakeAccountInstruction,
          stakeInstruction
        )

        try {
          const transactionSignature = await sendTransaction(
            transaction,
            connection
          )

          const latestBlockHash = await connection.getLatestBlockhash()
          await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: transactionSignature,
          })

          console.log(
            `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
          )

          router.push(`/stake?mint=${mint}&imageSrc=${nftData?.json.image}`)
        } catch (error) {
          alert(error)
        }
      }
    },
    [router, mint, nftData]
  )

  return (
    <MainLayout>
      <VStack spacing={20}>
        <Container>
          <VStack spacing={8}>
            <Heading color="white" as="h1" size="2xl" textAlign="center">
              😮 A new buildoor has appeared!
            </Heading>

            <Text color="bodyText" fontSize="xl" textAlign="center">
              Congratulations, you minted a lvl 1 buildoor! <br />
              Time to stake your character to earn rewards and level up.
            </Text>
          </VStack>
        </Container>

        <Image src={nftData?.json.image ?? ""} alt="" />

        <Button
          bgColor="accent"
          color="white"
          maxW="380px"
          onClick={handleClick}
        >
          <HStack>
            <Text>stake my buildoor</Text>
            <ArrowForwardIcon />
          </HStack>
        </Button>
      </VStack>
    </MainLayout>
  )
}

interface NewMintProps {
  mint: PublicKey
}

NewMint.getInitialProps = async ({ query }) => {
  const { mint } = query

  if (!mint) throw { error: "no mint" }

  try {
    const mintPubkey = new PublicKey(mint)
    return { mint: mintPubkey }
  } catch {
    throw { error: "invalid mint" }
  }
}

export default NewMint
